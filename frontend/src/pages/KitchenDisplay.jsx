import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui';
import ordersService from '../services/ordersService';
import { useRestaurant } from '../hooks/useRestaurant';
import { onSocketEvent, isOwnUpdate, markOwnUpdate } from '../services/socketService';
import { normalizeKitchenItems } from '../utils/kitchenOrderNormalize';

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

// Cantidad de columnas según ancho de pantalla (tarjetas angostas para caber más pedidos por fila)
const COLUMN_BREAKPOINTS = [
  { minWidth: 1536, columns: 6 },
  { minWidth: 1280, columns: 5 },
  { minWidth: 1024, columns: 4 },
  { minWidth: 768, columns: 3 },
  { minWidth: 640, columns: 2 },
  { minWidth: 0, columns: 1 },
];

const getColumnCount = (width) => {
  const match = COLUMN_BREAKPOINTS.find((bp) => width >= bp.minWidth);
  return match ? match.columns : 1;
};

const getOrderId = (order) => order._id || order.id;

const getElapsedMinutes = (order, now) => {
  const createdAt = new Date(order.createdAt).getTime();
  return (now - createdAt) / 60000;
};

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

  const kitchenDisplayEnabled = Boolean(restaurant?.settings?.kitchenDisplay?.enabled);
  const requireAllItemsReady = Boolean(restaurant?.settings?.kitchenDisplay?.requireAllItemsReady);

  const [orders, setOrders] = useState([]);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [columnCount, setColumnCount] = useState(() => getColumnCount(window.innerWidth));
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    const handleResize = () => setColumnCount(getColumnCount(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await ordersService.getSectionOrders();
      if (response.success) {
        setOrders(response.active || []);
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Error al cargar pedidos de cocina');
    }
  }, []);

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
        return [order, ...prev];
      });
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order }) => {
      if (!order) return;
      const orderId = getOrderId(order);
      if (isOwnUpdate(orderId)) return;

      setOrders((prev) => {
        if (order.status !== 'Preparacion') {
          return prev.filter((o) => getOrderId(o) !== orderId);
        }
        const exists = prev.some((o) => getOrderId(o) === orderId);
        if (!exists) return [order, ...prev];
        return prev.map((o) => (getOrderId(o) === orderId ? order : o));
      });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const bySection = sectionFilter === 'all'
      ? orders
      : orders.filter((order) => order.section === sectionFilter);
    // Más antiguos primero, más nuevos al final
    return [...bySection].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders, sectionFilter]);

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

  // Distribución en columnas independientes: si una tarjeta crece por tener más
  // productos, solo empuja hacia abajo a las tarjetas de SU misma columna,
  // sin desordenar ni ocupar el lugar de tarjetas de otras columnas.
  const buildColumns = useCallback(
    (list) => {
      const cols = Array.from({ length: columnCount }, () => []);
      list.forEach((order, index) => {
        cols[index % columnCount].push(order);
      });
      return cols;
    },
    [columnCount]
  );

  const activeColumns = useMemo(() => buildColumns(activeOrders), [activeOrders, buildColumns]);
  const readyColumns = useMemo(() => buildColumns(readyOrders), [readyOrders, buildColumns]);

  const handleMarkReady = async (orderId) => {
    markOwnUpdate(orderId);
    try {
      await ordersService.updateOrderWithoutPrint(orderId, {
        kitchenReadyAt: new Date().toISOString(),
      });
      setOrders((prev) =>
        prev.map((o) =>
          getOrderId(o) === orderId ? { ...o, kitchenReadyAt: new Date().toISOString() } : o
        )
      );
    } catch (err) {
      setError(err.message || 'Error al marcar el pedido como listo');
    }
  };

  const handleToggleItemReady = async (orderId, foodItemId, nextReady) => {
    markOwnUpdate(orderId);
    try {
      const response = await ordersService.updateOrderItemReady(orderId, foodItemId, nextReady);
      const updatedOrder = response.order;
      if (!updatedOrder) return;
      setOrders((prev) =>
        prev.map((o) => (getOrderId(o) === orderId ? updatedOrder : o))
      );
    } catch (err) {
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
        <h1 className="text-3xl font-bold">Cocina</h1>
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
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-lg">{error}</div>
      )}

      {showReady && readyOrders.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-700">
          <div className="flex gap-4 items-start">
            {readyColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex-1 min-w-0 flex flex-col gap-4">
                {column.map((order) => (
                  <KitchenOrderCard
                    key={getOrderId(order)}
                    order={order}
                    now={now}
                    onMarkReady={handleMarkReady}
                    requireAllItemsReady={requireAllItemsReady}
                    onToggleItemReady={handleToggleItemReady}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeOrders.length === 0 ? (
        <p className="text-gray-400 text-xl text-center mt-12">
          No hay pedidos en preparación
        </p>
      ) : (
        <div className="flex gap-4 items-start">
          {activeColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex-1 min-w-0 flex flex-col gap-4">
              {column.map((order) => (
                <KitchenOrderCard
                  key={getOrderId(order)}
                  order={order}
                  now={now}
                  onMarkReady={handleMarkReady}
                  requireAllItemsReady={requireAllItemsReady}
                  onToggleItemReady={handleToggleItemReady}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KitchenOrderCard = ({ order, now, onMarkReady, requireAllItemsReady, onToggleItemReady }) => {
  const orderId = getOrderId(order);
  const elapsedMinutes = getElapsedMinutes(order, now);
  const urgencyVariant = getUrgencyVariant(elapsedMinutes);
  const items = normalizeKitchenItems(order);
  const isReady = Boolean(order.kitchenReadyAt);
  const readyItemsCount = items.filter((item) => item.ready).length;

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
        <div
          className={`mt-2 py-2.5 rounded-lg text-center text-sm font-bold ${
            isReady ? 'bg-green-950 text-green-300' : 'bg-gray-900 text-gray-400'
          }`}
        >
          {isReady ? '✓ Todos los productos listos' : `${readyItemsCount}/${items.length} productos listos`}
        </div>
      ) : (
        <button
          onClick={() => onMarkReady(orderId)}
          disabled={isReady}
          className={`mt-2 py-3 rounded-lg text-lg font-bold transition-colors ${
            isReady
              ? 'bg-green-950 text-green-300 cursor-default'
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {isReady ? 'Listo' : 'Marcar Listo'}
        </button>
      )}
    </div>
  );
};

export default KitchenDisplay;
