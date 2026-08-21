import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui';
import ordersService from '../services/ordersService';
import { useRestaurant } from '../hooks/useRestaurant';
import { useAuth } from '../hooks/useAuth';
import { ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/outline';
import { onSocketEvent, markOwnUpdate } from '../services/socketService';
import { normalizeKitchenItems } from '../utils/kitchenOrderNormalize';
import categoriesService from '../services/categoriesService';

// Umbrales del semáforo (minutos desde la creación del pedido). Ajustar aquí si se necesita otro ritmo de cocina.
const KDS_WARNING_MINUTES = 10;
const KDS_OVERDUE_MINUTES = 20;
const KDS_TICK_MS = 15 * 1000;

const SECTION_LABELS = {
  mesas: 'Mesas',
  mostrador: 'Mostrador',
  delivery: 'Delivery',
};

const SECTION_FILTERS = ['all', 'mesas', 'mostrador', 'delivery'];

const getOrderId = (order) => order._id || order.id;

const getItemCategoryId = (item) => {
  const category = item.food?.category;
  return (category && (category._id || category)) || null;
};

const orderMatchesCategories = (order, categoryIds) => {
  if (categoryIds.size === 0) return true;
  if (!Array.isArray(order.foods)) return false;
  return order.foods.some((item) => {
    const categoryId = getItemCategoryId(item);
    return categoryId && categoryIds.has(String(categoryId));
  });
};

const playNewOrderSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [880, 1320].forEach((freq, idx) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      const start = now + idx * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio no disponible; se ignora en silencio.
  }
};

// kitchenActivityAt se reinicia cuando se agregan productos a una orden que ya
// estaba lista, para que vuelva a mostrarse como recién ingresada.
const getKitchenTimeReference = (order) => new Date(order.kitchenActivityAt || order.createdAt).getTime();

const getElapsedMinutes = (order, now) => (now - getKitchenTimeReference(order)) / 60000;

const getUrgencyVariant = (elapsedMinutes) => {
  if (elapsedMinutes >= KDS_OVERDUE_MINUTES) return 'danger';
  if (elapsedMinutes >= KDS_WARNING_MINUTES) return 'secondary'; // naranjo
  return 'success';
};

const getOrderLabel = (order) => {
  if (order.section === 'mesas') {
    const table = order.tableNumber ? `Mesa ${order.tableNumber}` : 'Mesa s/n';
    const waiterName = order.waiter?.userName || order.waiter?.name || '';
    return waiterName ? `${table} · ${waiterName}` : table;
  }
  if (order.section === 'delivery') {
    return order.selectedAddress || order.buyer?.name || order.name || 'Delivery';
  }
  return order.buyer?.name || order.name || 'Mostrador';
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

  const [orders, setOrders] = useState([]);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [showReady, setShowReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => new Set());
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);
  // Guardas de cambios optimistas en curso: evitan que un evento de socket o una
  // respuesta desactualizada revierta momentáneamente un "listo" que el usuario
  // acaba de marcar/desmarcar, hasta que el servidor confirme el mismo valor.
  const pendingItemReadyRef = useRef({});
  const pendingOrderReadyRef = useRef({});

  // Aplica las guardas pendientes sobre un pedido recién recibido (socket o respuesta HTTP),
  // limpiando las que ya coinciden con el valor confirmado por el servidor.
  const applyPendingGuards = useCallback((order) => {
    if (!order) return order;
    const orderId = getOrderId(order);

    let kitchenReadyAt = order.kitchenReadyAt;
    if (Object.prototype.hasOwnProperty.call(pendingOrderReadyRef.current, orderId)) {
      const pendingValue = pendingOrderReadyRef.current[orderId];
      const serverHasIt = Boolean(order.kitchenReadyAt);
      if (serverHasIt === pendingValue) {
        delete pendingOrderReadyRef.current[orderId];
      } else if (pendingValue) {
        kitchenReadyAt = kitchenReadyAt || new Date().toISOString();
      }
    }

    const foods = Array.isArray(order.foods)
      ? order.foods.map((food) => {
          const key = `${orderId}:${food._id}`;
          if (!Object.prototype.hasOwnProperty.call(pendingItemReadyRef.current, key)) return food;
          const pendingValue = pendingItemReadyRef.current[key];
          const serverReady = Boolean(food.ready);
          if (pendingValue === serverReady) {
            delete pendingItemReadyRef.current[key];
            return food;
          }
          return { ...food, ready: pendingValue };
        })
      : order.foods;

    return { ...order, kitchenReadyAt, foods };
  }, []);

  const toggleCategoryFilter = (categoryId) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  useEffect(() => {
    if (!categoryMenuOpen) return;
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

  const loadOrders = useCallback(async () => {
    try {
      const response = await ordersService.getSectionOrders();
      if (response.success) {
        setOrders((response.active || []).map(applyPendingGuards));
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Error al cargar pedidos de cocina');
    }
  }, [applyPendingGuards]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), KDS_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const unsubCreated = onSocketEvent('order:created', ({ order }) => {
      if (!order || !Array.isArray(order.foods) || order.foods.length === 0) return;
      setOrders((prev) => {
        if (prev.some((o) => getOrderId(o) === getOrderId(order))) return prev;
        playNewOrderSound();
        return [order, ...prev];
      });
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order }) => {
      if (!order) return;
      const orderId = getOrderId(order);
      const guardedOrder = applyPendingGuards(order);

      setOrders((prev) => {
        if (guardedOrder.status !== 'Preparacion') {
          return prev.filter((o) => getOrderId(o) !== orderId);
        }
        const previous = prev.find((o) => getOrderId(o) === orderId);
        if (!previous) {
          playNewOrderSound();
          return [guardedOrder, ...prev];
        }
        if (previous.kitchenReadyAt && !guardedOrder.kitchenReadyAt) {
          playNewOrderSound();
        }
        return prev.map((o) => (getOrderId(o) === orderId ? guardedOrder : o));
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [applyPendingGuards]);

  const filteredOrders = useMemo(() => {
    const bySection = sectionFilter === 'all'
      ? orders
      : orders.filter((order) => order.section === sectionFilter);
    const byCategory = bySection.filter((order) => orderMatchesCategories(order, selectedCategoryIds));
    // Más antiguos primero, más nuevos al final
    return [...byCategory].sort((a, b) => getKitchenTimeReference(a) - getKitchenTimeReference(b));
  }, [orders, sectionFilter, selectedCategoryIds]);

  // Los pedidos listos se sacan de la lista principal para no estorbar; se ven
  // aparte, en un panel plegable, para no perder de vista los que aún se preparan.
  const activeOrders = useMemo(
    () => filteredOrders.filter((order) => !order.kitchenReadyAt),
    [filteredOrders]
  );
  const readyOrders = useMemo(
    () => filteredOrders.filter((order) => order.kitchenReadyAt),
    [filteredOrders]
  );

  const handleMarkReady = async (orderId) => {
    markOwnUpdate(orderId);
    const readyAt = new Date().toISOString();
    pendingOrderReadyRef.current[orderId] = true;
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
    const key = `${orderId}:${foodItemId}`;
    pendingItemReadyRef.current[key] = nextReady;
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
    <div className="h-screen w-screen overflow-y-auto bg-gray-900 text-white p-6">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Cocina</h1>
          <span className="px-3 py-1 rounded-full text-lg font-bold bg-amber-500 text-gray-900">
            {activeOrders.length} en preparación
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowReady((prev) => !prev)}
            disabled={readyOrders.length === 0}
            className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors flex items-center gap-2 ${
              showReady
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-default`}
          >
            ✓ Listos ({readyOrders.length})
            <span className={`transition-transform ${showReady ? 'rotate-180' : ''}`}>▾</span>
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          {SECTION_FILTERS.map((section) => (
            <button
              key={section}
              onClick={() => setSectionFilter(section)}
              className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${
                sectionFilter === section
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
                    selectedCategoryIds.size > 0
                      ? 'bg-amber-500 text-gray-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Categorías
                  {selectedCategoryIds.size > 0 && (
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
                      {selectedCategoryIds.size > 0 && (
                        <button
                          onClick={() => setSelectedCategoryIds(new Set())}
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
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-lg font-medium transition-colors flex items-center gap-2 bg-gray-800 text-red-300 hover:bg-red-900/60"
          >
            <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-lg">{error}</div>
      )}

      {showReady && readyOrders.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {readyOrders.map((order) => (
              <KitchenOrderCard
                key={getOrderId(order)}
                order={order}
                now={now}
                onMarkReady={handleMarkReady}
                requireAllItemsReady={requireAllItemsReady}
                onToggleItemReady={handleToggleItemReady}
                canMarkReady={canMarkReady}
                selectedCategoryIds={selectedCategoryIds}
              />
            ))}
          </div>
        </div>
      )}

      {activeOrders.length === 0 ? (
        <p className="text-gray-400 text-xl text-center mt-12">
          No hay pedidos en preparación
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {activeOrders.map((order) => (
            <KitchenOrderCard
              key={getOrderId(order)}
              order={order}
              now={now}
              onMarkReady={handleMarkReady}
              requireAllItemsReady={requireAllItemsReady}
              onToggleItemReady={handleToggleItemReady}
              canMarkReady={canMarkReady}
              selectedCategoryIds={selectedCategoryIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const KitchenOrderCard = ({ order, now, onMarkReady, requireAllItemsReady, onToggleItemReady, canMarkReady, selectedCategoryIds }) => {
  const orderId = getOrderId(order);
  const elapsedMinutes = getElapsedMinutes(order, now);
  const urgencyVariant = getUrgencyVariant(elapsedMinutes);
  const allItems = normalizeKitchenItems(order);
  // Solo se muestran los productos de las categorías filtradas, pero la
  // confirmación de "listo" sigue dependiendo del pedido completo.
  const items = selectedCategoryIds && selectedCategoryIds.size > 0
    ? allItems.filter((item) => item.categoryId && selectedCategoryIds.has(String(item.categoryId)))
    : allItems;
  const isReady = Boolean(order.kitchenReadyAt);
  const readyItemsCount = allItems.filter((item) => item.ready).length;
  const allItemsReady = allItems.length > 0 && readyItemsCount === allItems.length;

  return (
    <div
      className={`rounded-xl border-2 p-4 flex flex-col gap-3 ${
        isReady
          ? 'bg-green-900 border-green-400 shadow-lg shadow-green-900/50'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">#{order.orderNumber}</span>
        {isReady ? (
          <Badge variant="success" size="lg">✓ Listo</Badge>
        ) : (
          <Badge variant={urgencyVariant} size="lg">
            {Math.max(0, Math.floor(elapsedMinutes))} min
          </Badge>
        )}
      </div>

      <div className={`text-sm ${isReady ? 'text-green-200' : 'text-gray-300'}`}>
        <div>{SECTION_LABELS[order.section] || order.section}</div>
        <div className="font-medium text-white">{getOrderLabel(order)}</div>
      </div>

      {requireAllItemsReady ? (
        <ul className="space-y-1.5 text-lg">
          {items.map((item, idx) => (
            <li key={item.id || idx}>
              <button
                type="button"
                onClick={() => onToggleItemReady(orderId, item.id, !item.ready)}
                disabled={!item.id}
                className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-lg transition-colors ${
                  item.ready ? 'bg-green-950/60' : 'bg-gray-900/40 hover:bg-gray-900/70'
                }`}
              >
                <span
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-sm ${
                    item.ready ? 'bg-green-500 border-green-500 text-gray-900' : 'border-gray-500 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className={item.ready ? 'line-through text-green-300' : ''}>
                  <span className="font-semibold">{item.quantity}x</span> {item.productName}
                  {item.notes && (
                    <div className="text-sm pl-1 text-amber-300 no-underline">— {item.notes}</div>
                  )}
                  {item.selectedExtras.length > 0 && (
                    <div className="text-sm pl-1 text-gray-400 no-underline">
                      {item.selectedExtras.map((extra) => extra.extraName).join(', ')}
                    </div>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1 text-lg">
          {items.map((item, idx) => (
            <li key={idx}>
              <span className="font-semibold">{item.quantity}x</span> {item.productName}
              {item.notes && (
                <div className={`text-sm pl-4 ${isReady ? 'text-green-200' : 'text-amber-300'}`}>— {item.notes}</div>
              )}
              {item.selectedExtras.length > 0 && (
                <div className={`text-sm pl-4 ${isReady ? 'text-green-300' : 'text-gray-400'}`}>
                  {item.selectedExtras.map((extra) => extra.extraName).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {order.comment && (
        <div className={`text-sm border-t pt-2 ${isReady ? 'text-green-200 border-green-700' : 'text-amber-300 border-gray-700'}`}>
          {order.comment}
        </div>
      )}

      {requireAllItemsReady ? (
        <>
          <div
            className={`mt-2 py-1.5 rounded-lg text-center text-sm font-bold ${
              isReady ? 'bg-green-950 text-green-300' : 'bg-gray-900 text-gray-400'
            }`}
          >
            {isReady ? '✓ Todos los productos listos' : `${readyItemsCount}/${allItems.length} productos listos`}
          </div>
          <button
            onClick={() => onMarkReady(orderId)}
            disabled={isReady || !allItemsReady || !canMarkReady}
            title={!canMarkReady ? 'Solo el dueño puede confirmar el pedido como listo' : undefined}
            className={`py-3 rounded-lg text-lg font-bold transition-colors ${
              isReady
                ? 'bg-green-950 text-green-300 cursor-default'
                : allItemsReady && canMarkReady
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isReady ? 'Listo' : 'Confirmar Listo'}
          </button>
        </>
      ) : (
        <button
          onClick={() => onMarkReady(orderId)}
          disabled={isReady || !canMarkReady}
          title={!canMarkReady ? 'Solo el dueño puede confirmar el pedido como listo' : undefined}
          className={`mt-2 py-3 rounded-lg text-lg font-bold transition-colors ${
            isReady
              ? 'bg-green-950 text-green-300 cursor-default'
              : canMarkReady
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isReady ? 'Listo' : 'Marcar Listo'}
        </button>
      )}
    </div>
  );
};

export default KitchenDisplay;
