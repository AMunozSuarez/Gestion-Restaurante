import { useEffect } from 'react';
import { onSocketEvent, getSocketId, isOwnUpdate } from '../../services/socketService';
import printingService from '../../services/printingService';

/**
 * Componente global que escucha TODOS los pedidos creados/actualizados vía Socket.io
 * e imprime automáticamente la comanda de cocina.
 * Se monta en el Layout para que esté siempre activo sin importar la página abierta.
 *
 * Solo imprime pedidos creados por OTRO cliente (ej: app Flutter).
 * Pedidos creados por este mismo navegador ya se imprimen en ordersService.createOrder().
 */
const SocketOrderPrinter = () => {
  useEffect(() => {
    const unsubCreated = onSocketEvent('order:created', ({ order, _fromSocketId }) => {
      if (!order) return;
      // Ignorar pedidos creados por este mismo cliente (ya se imprimen en ordersService)
      if (_fromSocketId && _fromSocketId === getSocketId()) return;

      const hasProducts = Array.isArray(order.foods) && order.foods.length > 0;
      if (!hasProducts) return;

      try {
        const defaultPrinter = printingService.getDefaultPrinter();
        if (defaultPrinter) {
          printingService.printKitchenOrder(order).catch((err) => {
            console.error('Error al imprimir comanda automática:', err);
          });
        }
      } catch (e) {
        console.error('Error al obtener impresora:', e);
      }
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order, newFoods, _fromSocketId }) => {
      if (!order) return;
      // Ignorar actualizaciones de este mismo cliente
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (isOwnUpdate(order._id)) return;
      // No imprimir si se está completando/cancelando
      if (order.status === 'Completado' || order.status === 'Cancelado') return;

      const hasProducts = Array.isArray(order.foods) && order.foods.length > 0;
      if (!hasProducts) return;

      console.log('🟢 Socket order:updated recibido');
      console.log('🟢 newFoods recibido:', newFoods);
      console.log('🟢 deletedFoods:', order.deletedFoods?.map(d => ({ name: d.food?.title, qty: d.quantity })));

      try {
        const defaultPrinter = printingService.getDefaultPrinter();
        if (defaultPrinter) {
          // Pass newFoods for asterisk marking on new items
          const options = newFoods && newFoods.length > 0 ? { newFoods } : {};
          console.log('🟢 Imprimiendo con options:', options);
          printingService.printKitchenOrder(order, options).catch((err) => {
            console.error('Error al imprimir comanda actualizada:', err);
          });
        }
      } catch (e) {
        console.error('Error al obtener impresora:', e);
      }
    });

    const unsubTicket = onSocketEvent('ticket:print', ({ order }) => {
      if (!order) return;
      console.log('🟣 Socket ticket:print recibido');
      console.log('🟣 tip:', order.tip);
      console.log('🟣 deletedFoods:', order.deletedFoods?.map(d => ({ name: d.food?.title, qty: d.quantity })));
      try {
        const defaultPrinter = printingService.getDefaultPrinter();
        if (defaultPrinter) {
          printingService.printCustomerTicket(order).catch((err) => {
            console.error('Error al imprimir ticket solicitado:', err);
          });
        }
      } catch (e) {
        console.error('Error al imprimir ticket:', e);
      }
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubTicket();
    };
  }, []);

  return null;
};

export default SocketOrderPrinter;
