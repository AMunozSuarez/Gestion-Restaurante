import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ordersService from '../services/ordersService';
import categoriesService from '../services/categoriesService';
import { useRestaurant } from '../hooks/useRestaurant';
import { useAuth } from '../hooks/useAuth';
import { ArrowRightEndOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { onSocketEvent, markOwnUpdate } from '../services/socketService';
import KitchenOrderCard from '../components/kitchen/KitchenOrderCard';
import KdsBoard from '../components/kitchen/KdsBoard';
import KdsSettingsPanel from '../components/kitchen/KdsSettingsPanel';
import { normalizeKitchenItems } from '../utils/kitchenOrderNormalize';
import {
  KDS_MODES,
  clearStoredKdsConfig,
  initKdsScreenConfig,
  saveKdsConfig,
} from '../services/kdsScreenConfig';
import {
  KDS_RESYNC_MS,
  KDS_TICK_MS,
  MAX_CARD_PARTS,
  PENDING_GUARD_TTL_MS,
  SECTION_FILTERS,
  SECTION_LABELS,
  getKitchenTimeReference,
  getOrderId,
  getVisibleKitchenItems,
  isFragmented,
  isKitchenOrder,
  orderMatchesCategories,
  orderNeedsReconfirmation,
  playNewOrderSound,
  splitItemsIntoParts,
} from '../utils/kdsShared';

// Devuelve la guarda vigente y descarta la que ya expiró.
const readPendingGuard = (store, key) => {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.at > PENDING_GUARD_TTL_MS) {
    delete store[key];
    return null;
  }
  return entry;
};

// Combina el snapshot HTTP con el estado local. Los pedidos que el socket tocó
// mientras la consulta viajaba se conservan tal cual: el snapshot puede ser
// anterior a ese cambio y lo revertiría (pedido cerrado que reaparece, o pedido
// nuevo que desaparece).
const mergeSnapshot = (prev, snapshot, touchedIds) => {
  const localById = new Map(prev.map((order) => [String(getOrderId(order)), order]));
  const snapshotIds = new Set(snapshot.map((order) => String(getOrderId(order))));

  const merged = snapshot.reduce((acc, order) => {
    const id = String(getOrderId(order));
    if (!touchedIds.has(id)) {
      acc.push(order);
      return acc;
    }
    // El socket lo tocó durante la consulta: si sigue local, gana la versión
    // local; si el socket lo quitó, no se vuelve a agregar.
    const local = localById.get(id);
    if (local) acc.push(local);
    return acc;
  }, []);

  // Pedidos que llegaron por socket después de que salió la consulta.
  const socketOnly = prev.filter((order) => {
    const id = String(getOrderId(order));
    return touchedIds.has(id) && !snapshotIds.has(id);
  });

  return [...socketOnly, ...merged];
};

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const kitchenDisplayEnabled = Boolean(restaurant?.settings?.kitchenDisplay?.enabled);
  const requireAllItemsReady = Boolean(restaurant?.settings?.kitchenDisplay?.requireAllItemsReady);
  const onlyOwnerCanMarkReady = Boolean(restaurant?.settings?.kitchenDisplay?.onlyOwnerCanMarkReady);
  const canMarkReady = !onlyOwnerCanMarkReady || ['owner', 'super_admin'].includes(user?.role);

  // Configuración propia de este dispositivo: la URL la siembra una vez y
  // localStorage la sostiene desde ahí. Ver services/kdsScreenConfig.
  const [screenConfig, setScreenConfig] = useState(initKdsScreenConfig);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const updateScreenConfig = useCallback((patch) => {
    setScreenConfig((prev) => saveKdsConfig({ ...prev, ...patch }));
  }, []);

  const isTvMode = screenConfig.mode === KDS_MODES.TV;
  const selectedCategoryIds = useMemo(
    () => new Set(screenConfig.categoryIds.map(String)),
    [screenConfig.categoryIds]
  );
  const stationFilterActive = selectedCategoryIds.size > 0;
  // Con un filtro de categorías la pantalla es una estación, y el único modo
  // coherente es el checklist por producto: la estación marca lo suyo y el
  // pedido lo cierra la última en terminar. Sin checklist, "Marcar Listo"
  // cerraría el pedido entero incluyendo lo que otra estación no ha preparado.
  const checklistMode = requireAllItemsReady || stationFilterActive;

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionLost, setConnectionLost] = useState(false);
  // Mensaje del backend cuando la lista viene vacía por una razón concreta
  // (ej: no hay caja abierta), para no mostrar "no hay pedidos" y confundir.
  const [emptyNotice, setEmptyNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [showReady, setShowReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);
  // Guardas de cambios optimistas en curso: evitan que un evento de socket o una
  // respuesta desactualizada revierta momentáneamente un "listo" que el usuario
  // acaba de marcar/desmarcar, hasta que el servidor confirme el mismo valor.
  const pendingItemReadyRef = useRef({});
  const pendingOrderReadyRef = useRef({});
  // IDs que el socket (o una acción local) modificó desde que salió la última
  // consulta HTTP: mergeSnapshot los protege de un snapshot desactualizado.
  const socketTouchedRef = useRef(new Set());
  // Secuencia de consultas: descarta respuestas que llegan fuera de orden.
  const syncSeqRef = useRef(0);
  // Espejo de `orders` para decidir el sonido FUERA del updater de estado: los
  // updaters deben ser puros y React 19 en StrictMode los invoca dos veces.
  const ordersRef = useRef([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const markTouched = useCallback((orderId) => {
    socketTouchedRef.current.add(String(orderId));
  }, []);

  // El sonido solo tiene sentido si esta pantalla realmente va a mostrar el
  // pedido: la tablet de parrilla no debe pitar por un pedido de solo postres.
  const shouldNotifyForOrder = useCallback(
    (order) => {
      if (!screenConfig.sound || !order) return false;
      if (screenConfig.section !== 'all' && order.section !== screenConfig.section) return false;
      return orderMatchesCategories(order, selectedCategoryIds);
    },
    [screenConfig.sound, screenConfig.section, selectedCategoryIds]
  );

  // Aplica las guardas pendientes sobre un pedido recién recibido (socket o respuesta HTTP),
  // limpiando las que ya coinciden con el valor confirmado por el servidor.
  const applyPendingGuards = useCallback((order) => {
    if (!order) return order;
    const orderId = getOrderId(order);

    let kitchenReadyAt = order.kitchenReadyAt;
    const orderGuard = readPendingGuard(pendingOrderReadyRef.current, orderId);
    if (orderGuard) {
      const serverHasIt = Boolean(order.kitchenReadyAt);
      if (serverHasIt === orderGuard.value) {
        delete pendingOrderReadyRef.current[orderId];
      } else if (orderGuard.value) {
        kitchenReadyAt = kitchenReadyAt || new Date().toISOString();
      } else {
        kitchenReadyAt = null;
      }
    }

    const foods = Array.isArray(order.foods)
      ? order.foods.map((food) => {
          const key = `${orderId}:${food._id}`;
          const guard = readPendingGuard(pendingItemReadyRef.current, key);
          if (!guard) return food;
          const serverReady = Boolean(food.ready);
          if (guard.value === serverReady) {
            delete pendingItemReadyRef.current[key];
            return food;
          }
          return { ...food, ready: guard.value };
        })
      : order.foods;

    return { ...order, kitchenReadyAt, foods };
  }, []);

  const toggleCategoryFilter = (categoryId) => {
    const next = new Set(selectedCategoryIds);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    updateScreenConfig({ categoryIds: [...next] });
  };

  useEffect(() => {
    if (!categoryMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryMenuOpen]);

  useEffect(() => {
    categoriesService
      .getCategories({ availableOnly: true })
      .then((response) => {
        if (response.success) setCategories(response.categories || []);
      })
      .catch(() => {});
  }, []);

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    const seq = ++syncSeqRef.current;
    // A partir de aquí se registran los IDs que toque el socket mientras la
    // consulta está en vuelo, para que el snapshot no los pise.
    const touched = new Set();
    socketTouchedRef.current = touched;
    if (!silent) setIsLoading(true);

    try {
      const response = await ordersService.getSectionOrders({ skipCache: true });
      if (seq !== syncSeqRef.current) return; // llegó una respuesta más nueva
      if (!response.success) {
        setError(response.message || 'Error al cargar pedidos de cocina');
        return;
      }
      const snapshot = (response.active || []).filter(isKitchenOrder).map(applyPendingGuards);
      setOrders((prev) => mergeSnapshot(prev, snapshot, touched));
      setEmptyNotice(snapshot.length === 0 && response.message ? response.message : '');
      setError('');
    } catch (err) {
      if (seq !== syncSeqRef.current) return;
      setError(err.message || 'Error al cargar pedidos de cocina');
    } finally {
      if (seq === syncSeqRef.current) setIsLoading(false);
    }
  }, [applyPendingGuards]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Resincronización: al (re)conectar el socket, al volver a la pestaña y cada
  // minuto. Cubre los eventos perdidos sin red y los pedidos que se cerraron o
  // eliminaron desde otro dispositivo mientras esta pantalla estaba abierta.
  useEffect(() => {
    const unsubConnect = onSocketEvent('connect', () => {
      setConnectionLost(false);
      loadOrders({ silent: true });
    });
    const unsubDisconnect = onSocketEvent('disconnect', () => setConnectionLost(true));

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadOrders({ silent: true });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const resync = setInterval(() => loadOrders({ silent: true }), KDS_RESYNC_MS);

    return () => {
      unsubConnect();
      unsubDisconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(resync);
    };
  }, [loadOrders]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), KDS_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const unsubCreated = onSocketEvent('order:created', ({ order }) => {
      // Solo entran a cocina los pedidos en preparación: una venta directa se
      // crea ya "Completado" y no debe aparecer aquí.
      if (!isKitchenOrder(order)) return;
      const orderId = getOrderId(order);
      markTouched(orderId);

      const alreadyListed = ordersRef.current.some((o) => getOrderId(o) === orderId);
      if (!alreadyListed && shouldNotifyForOrder(order)) playNewOrderSound();

      setOrders((prev) => {
        if (prev.some((o) => getOrderId(o) === orderId)) return prev;
        return [order, ...prev];
      });
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order }) => {
      if (!order) return;
      const orderId = getOrderId(order);
      markTouched(orderId);
      const guardedOrder = applyPendingGuards(order);

      if (isKitchenOrder(guardedOrder)) {
        const previous = ordersRef.current.find((o) => getOrderId(o) === orderId);
        // Suena cuando el pedido entra a esta pantalla, y cuando uno que estaba
        // listo vuelve a preparación (le agregaron productos).
        const isNewHere = !previous;
        const wentBackToPreparation = Boolean(previous?.kitchenReadyAt) && !guardedOrder.kitchenReadyAt;
        if ((isNewHere || wentBackToPreparation) && shouldNotifyForOrder(guardedOrder)) {
          playNewOrderSound();
        }
      }

      setOrders((prev) => {
        // Cobrado, cancelado o sin productos: fuera de la pantalla de cocina.
        if (!isKitchenOrder(guardedOrder)) {
          return prev.filter((o) => getOrderId(o) !== orderId);
        }
        const previous = prev.find((o) => getOrderId(o) === orderId);
        if (!previous) return [guardedOrder, ...prev];
        return prev.map((o) => (getOrderId(o) === orderId ? guardedOrder : o));
      });
    });

    const unsubDeleted = onSocketEvent('order:deleted', ({ orderId }) => {
      if (!orderId) return;
      markTouched(orderId);
      setOrders((prev) => prev.filter((o) => String(getOrderId(o)) !== String(orderId)));
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [applyPendingGuards, markTouched, shouldNotifyForOrder]);

  const filteredOrders = useMemo(() => {
    const bySection = screenConfig.section === 'all'
      ? orders
      : orders.filter((order) => order.section === screenConfig.section);
    const byCategory = bySection.filter((order) => orderMatchesCategories(order, selectedCategoryIds));
    // Más antiguos primero, más nuevos al final
    return [...byCategory].sort((a, b) => getKitchenTimeReference(a) - getKitchenTimeReference(b));
  }, [orders, screenConfig.section, selectedCategoryIds]);

  // Los pedidos listos se sacan de la lista principal para no estorbar; se ven
  // aparte, en un panel plegable, para no perder de vista los que aún se preparan.
  // Excepción (solo con checklist, donde el ready por producto es real): si a un
  // pedido ya listo le agregaron un producto nuevo, aparece en AMBAS listas hasta
  // que se presione "Confirmar Listo" — cada tarjeta filtra a solo lo que
  // corresponde según viewContext.
  // Una tarjeta sin productos visibles no aporta nada y confunde. Se descarta
  // antes de renderizar, y así el contador de la cabecera coincide siempre con
  // lo que se ve en pantalla.
  const hasVisibleItems = useCallback(
    (order, viewContext) =>
      getVisibleKitchenItems({
        order,
        items: normalizeKitchenItems(order),
        categoryIds: selectedCategoryIds,
        viewContext,
        checklistMode,
      }).length > 0,
    [selectedCategoryIds, checklistMode]
  );

  const activeOrders = useMemo(
    () =>
      filteredOrders.filter(
        (order) =>
          (!order.kitchenReadyAt || (checklistMode && orderNeedsReconfirmation(order))) &&
          hasVisibleItems(order, 'active')
      ),
    [filteredOrders, checklistMode, hasVisibleItems]
  );
  const readyOrders = useMemo(
    () => filteredOrders.filter((order) => order.kitchenReadyAt && hasVisibleItems(order, 'ready')),
    [filteredOrders, hasVisibleItems]
  );

  // Cuántas partes necesita cada pedido para no quedar cortado. No se calcula:
  // se mide después de renderizar (ver el efecto de abajo). La clave incluye la
  // cantidad de productos, así que si al pedido le agregan uno, ese pedido
  // vuelve a medirse solo, sin perturbar a los demás.
  const [partSplits, setPartSplits] = useState({});
  const boardWrapRef = useRef(null);

  const getSplitKey = useCallback(
    (order) => `${getOrderId(order)}:${order.foods?.length || 0}`,
    []
  );

  // Cambió algo que altera la altura de las tarjetas: las medidas anteriores ya
  // no valen y hay que volver a medir desde una parte.
  const layoutSignature = `${screenConfig.columnWidth}:${screenConfig.scale}:${screenConfig.interactive}:${checklistMode}:${isTvMode}`;
  useEffect(() => {
    setPartSplits({});
  }, [layoutSignature]);

  // Tarjetas del tablero paginado: un pedido más largo que la columna se reparte
  // en varias tarjetas numeradas, porque si lo parte el navegador el trozo de la
  // columna siguiente queda sin encabezado y no se sabe de qué pedido es.
  const boardCards = useMemo(() => {
    if (!isTvMode) return [];

    return activeOrders.flatMap((order) => {
      const items = getVisibleKitchenItems({
        order,
        items: normalizeKitchenItems(order),
        categoryIds: selectedCategoryIds,
        viewContext: 'active',
        checklistMode,
      });
      const splitKey = getSplitKey(order);
      const parts = splitItemsIntoParts(items, partSplits[splitKey] || 1);

      return parts.map((chunk, index) => ({
        key: `${splitKey}:${index}`,
        splitKey,
        order,
        items: chunk,
        part: parts.length > 1 ? { index: index + 1, total: parts.length } : null,
      }));
    });
  }, [isTvMode, activeOrders, selectedCategoryIds, checklistMode, partSplits, getSplitKey]);

  // Mide lo que realmente pasó: si el navegador cortó una tarjeta entre columnas,
  // ese pedido se reparte en una parte más y se vuelve a medir. Converge porque
  // cada vuelta acorta las tarjetas, y el tope evita el ciclo infinito cuando un
  // solo producto ya no cabe. useLayoutEffect corrige antes de pintar, así que no
  // se alcanza a ver la tarjeta cortada.
  useLayoutEffect(() => {
    if (!isTvMode || !boardWrapRef.current) return;

    const updates = {};
    boardWrapRef.current.querySelectorAll('[data-kds-split-key]').forEach((node) => {
      if (!isFragmented(node)) return;
      const key = node.dataset.kdsSplitKey;
      const current = partSplits[key] || 1;
      if (current >= MAX_CARD_PARTS) return;
      updates[key] = Math.max(updates[key] || 0, current + 1);
    });

    if (Object.keys(updates).length > 0) {
      setPartSplits((prev) => ({ ...prev, ...updates }));
    }
  }, [isTvMode, boardCards, partSplits]);

  // El tablero necesita volver a medir cuántas páginas hacen falta cada vez que
  // cambia la altura del contenido: cambian los pedidos, sus productos o el reparto.
  const boardRevision = useMemo(
    () => boardCards.map((card) => `${card.key}:${card.items.length}`).join('|'),
    [boardCards]
  );

  const handleMarkReady = async (orderId) => {
    markOwnUpdate(orderId);
    markTouched(orderId);
    const readyAt = new Date().toISOString();
    pendingOrderReadyRef.current[orderId] = { value: true, at: Date.now() };
    setOrders((prev) =>
      prev.map((o) => (getOrderId(o) === orderId ? { ...o, kitchenReadyAt: readyAt } : o))
    );

    try {
      await ordersService.updateOrderWithoutPrint(orderId, { kitchenReadyAt: readyAt });
    } catch (err) {
      delete pendingOrderReadyRef.current[orderId];
      setOrders((prev) =>
        prev.map((o) => (getOrderId(o) === orderId ? { ...o, kitchenReadyAt: null } : o))
      );
      setError(err.message || 'Error al marcar el pedido como listo');
    }
  };

  const handleToggleItemReady = async (orderId, foodItemId, nextReady) => {
    markOwnUpdate(orderId);
    markTouched(orderId);
    const key = `${orderId}:${foodItemId}`;
    pendingItemReadyRef.current[key] = { value: nextReady, at: Date.now() };
    setOrders((prev) =>
      prev.map((o) => {
        if (getOrderId(o) !== orderId) return o;
        return {
          ...o,
          foods: (o.foods || []).map((food) =>
            food._id === foodItemId ? { ...food, ready: nextReady } : food
          ),
        };
      })
    );

    try {
      const response = await ordersService.updateOrderItemReady(orderId, foodItemId, nextReady);
      const updatedOrder = response.order;
      if (!updatedOrder) return;
      const guardedOrder = applyPendingGuards(updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (getOrderId(o) === orderId ? guardedOrder : o))
      );
    } catch (err) {
      delete pendingItemReadyRef.current[key];
      setOrders((prev) =>
        prev.map((o) => {
          if (getOrderId(o) !== orderId) return o;
          return {
            ...o,
            foods: (o.foods || []).map((food) =>
              food._id === foodItemId ? { ...food, ready: !nextReady } : food
            ),
          };
        })
      );
      setError(err.message || 'Error al actualizar el producto');
    }
  };

  const settingsButton = (
    <button
      onClick={() => setSettingsOpen(true)}
      title="Configuración de esta pantalla"
      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
    >
      <Cog6ToothIcon className="w-6 h-6" />
    </button>
  );

  const stationSummary = useMemo(() => {
    const parts = [];
    if (screenConfig.section !== 'all') parts.push(SECTION_LABELS[screenConfig.section]);
    if (stationFilterActive) {
      const names = categories
        .filter((category) => selectedCategoryIds.has(String(category._id)))
        .map((category) => category.title);
      if (names.length > 0) parts.push(names.join(' · '));
      else parts.push(`${selectedCategoryIds.size} categorías`);
    }
    return parts.join(' — ');
  }, [screenConfig.section, stationFilterActive, categories, selectedCategoryIds]);

  const emptyMessage = isLoading
    ? 'Cargando pedidos…'
    : emptyNotice || 'No hay pedidos en preparación';

  const cards = (orderList, viewContext) =>
    orderList.map((order) => (
      <KitchenOrderCard
        key={getOrderId(order)}
        order={order}
        now={now}
        onMarkReady={handleMarkReady}
        onToggleItemReady={handleToggleItemReady}
        checklistMode={checklistMode}
        canMarkReady={canMarkReady}
        selectedCategoryIds={selectedCategoryIds}
        viewContext={viewContext}
        interactive={screenConfig.interactive}
      />
    ));

  if (!isRestaurantLoading && !kitchenDisplayEnabled) {
    return (
      <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Pantalla de cocina desactivada</h2>
          <p className="text-sm text-gray-400 mb-6">
            La pantalla de cocina no está habilitada para este restaurante.
            Esta función la activa el administrador del sistema — contáctalo si la necesitas.
          </p>

          <button
            onClick={() => navigate('/mostrador')}
            className="px-4 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 text-white flex flex-col">
      {/* En modo TV la cabecera se reduce al mínimo: cada píxel que ocupa es un
          píxel menos para los pedidos, y los filtros ya vienen configurados. */}
      {isTvMode ? (
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 pt-4 pb-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-bold whitespace-nowrap">
              {screenConfig.screenName || 'Cocina'}
            </h1>
            {stationSummary && (
              <span className="text-sm text-gray-400 truncate">{stationSummary}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-3 py-1 rounded-full text-lg font-bold bg-amber-500 text-gray-900">
              {isLoading ? 'Cargando…' : `${activeOrders.length} en preparación`}
            </span>
            {settingsButton}
            {/* En un TV colgado nadie va a cerrar sesión, pero si alguien usa
                este layout en una tablet sí necesita poder salir. */}
            {screenConfig.interactive && (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-red-300 hover:bg-red-900/60 transition-colors"
              >
                <ArrowRightEndOnRectangleIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between mb-4 gap-4 flex-wrap px-6 pt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{screenConfig.screenName || 'Cocina'}</h1>
            <span className="px-3 py-1 rounded-full text-lg font-bold bg-amber-500 text-gray-900">
              {isLoading ? 'Cargando…' : `${activeOrders.length} en preparación`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowReady((prev) => !prev)}
              disabled={readyOrders.length === 0}
              className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors flex items-center gap-2 ${
                showReady ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-default`}
            >
              ✓ Listos ({readyOrders.length})
              <span className={`transition-transform ${showReady ? 'rotate-180' : ''}`}>▾</span>
            </button>
            <div className="w-px h-6 bg-gray-700 mx-1" />
            {SECTION_FILTERS.map((section) => (
              <button
                key={section}
                onClick={() => updateScreenConfig({ section })}
                className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${
                  screenConfig.section === section
                    ? 'bg-amber-500 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {section === 'all' ? 'Todas' : SECTION_LABELS[section]}
              </button>
            ))}
            {categories.length > 0 && (
              <>
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <div className="relative" ref={categoryMenuRef}>
                  <button
                    onClick={() => setCategoryMenuOpen((prev) => !prev)}
                    className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors flex items-center gap-2 ${
                      stationFilterActive
                        ? 'bg-amber-500 text-gray-900'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Categorías
                    {stationFilterActive && (
                      <span className="px-2 py-0.5 rounded-full text-sm bg-gray-900/20">
                        {selectedCategoryIds.size}
                      </span>
                    )}
                    <span className={`transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {categoryMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-2">
                      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-gray-700">
                        <span className="text-sm font-semibold text-gray-400 uppercase">Filtrar categorías</span>
                        {stationFilterActive && (
                          <button
                            onClick={() => updateScreenConfig({ categoryIds: [] })}
                            className="text-sm font-medium text-amber-400 hover:text-amber-300"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {categories.map((category) => {
                          const categoryId = String(category._id);
                          const isSelected = selectedCategoryIds.has(categoryId);
                          return (
                            <li key={categoryId}>
                              <button
                                onClick={() => toggleCategoryFilter(categoryId)}
                                className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg text-base hover:bg-gray-700/70 transition-colors"
                              >
                                <span
                                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-sm ${
                                    isSelected
                                      ? 'bg-amber-500 border-amber-500 text-gray-900'
                                      : 'border-gray-500 text-transparent'
                                  }`}
                                >
                                  ✓
                                </span>
                                <span className={isSelected ? 'text-white' : 'text-gray-300'}>{category.title}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="w-px h-6 bg-gray-700 mx-1" />
            {settingsButton}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-lg font-medium transition-colors flex items-center gap-2 bg-gray-800 text-red-300 hover:bg-red-900/60"
            >
              <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {(connectionLost || error) && (
        <div className="flex-shrink-0 px-6 pb-3 space-y-2">
          {connectionLost && (
            <div className="p-3 bg-amber-900 text-amber-100 rounded-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-pulse" />
              Sin conexión con el servidor — reconectando. La pantalla puede estar desactualizada.
            </div>
          )}
          {error && <div className="p-3 bg-red-900 text-red-100 rounded-lg">{error}</div>}
        </div>
      )}

      {isTvMode ? (
        <div ref={boardWrapRef} className="flex-1 min-h-0 px-6 pb-6">
          {activeOrders.length === 0 ? (
            <p className="text-gray-400 text-2xl text-center mt-12">{emptyMessage}</p>
          ) : (
            <KdsBoard
              columnWidth={screenConfig.columnWidth}
              rotateSeconds={screenConfig.rotateSeconds}
              scale={screenConfig.scale}
              revision={boardRevision}
              interactive={screenConfig.interactive}
              autoRotate={screenConfig.autoRotate}
            >
              {boardCards.map((card) => (
                <div
                  key={card.key}
                  data-kds-split-key={card.splitKey}
                  className="break-inside-avoid mb-4"
                >
                  <KitchenOrderCard
                    order={card.order}
                    now={now}
                    onMarkReady={handleMarkReady}
                    onToggleItemReady={handleToggleItemReady}
                    checklistMode={checklistMode}
                    canMarkReady={canMarkReady}
                    selectedCategoryIds={selectedCategoryIds}
                    viewContext="active"
                    interactive={screenConfig.interactive}
                    itemsOverride={card.items}
                    part={card.part}
                    // Red de seguridad: si aun así una tarjeta no cabe en la
                    // columna, cada trozo conserva su borde y se sigue leyendo
                    // como tarjeta en vez de quedar como texto suelto.
                    className="kds-card-part"
                  />
                </div>
              ))}
            </KdsBoard>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          {showReady && readyOrders.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-700">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${screenConfig.columnWidth}px, 1fr))`,
                  zoom: screenConfig.scale,
                }}
              >
                {cards(readyOrders, 'ready')}
              </div>
            </div>
          )}

          {activeOrders.length === 0 ? (
            <p className="text-gray-400 text-xl text-center mt-12">{emptyMessage}</p>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${screenConfig.columnWidth}px, 1fr))`,
                zoom: screenConfig.scale,
              }}
            >
              {cards(activeOrders, 'active')}
            </div>
          )}
        </div>
      )}

      {settingsOpen && (
        <KdsSettingsPanel
          config={screenConfig}
          categories={categories}
          onChange={updateScreenConfig}
          onReset={() => setScreenConfig(clearStoredKdsConfig())}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default KitchenDisplay;
