import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui';
import ordersService from '../services/ordersService';
import { useRestaurant } from '../hooks/useRestaurant';
import { useAuth } from '../hooks/useAuth';
import { ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/outline';
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

const KitchenOrderCard = ({ order, now, onMarkReady, requireAllItemsReady, onToggleItemReady, canMarkReady }) => {
  const orderId = getOrderId(order);
  const elapsedMinutes = getElapsedMinutes(order, now);
  const urgencyVariant = getUrgencyVariant(elapsedMinutes);
  const items = normalizeKitchenItems(order);
  const isReady = Boolean(order.kitchenReadyAt);
  const readyItemsCount = items.filter((item) => item.ready).length;
  const allItemsReady = items.length > 0 && readyItemsCount === items.length;

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
            {isReady ? '✓ Todos los productos listos' : `${readyItemsCount}/${items.length} productos listos`}
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
