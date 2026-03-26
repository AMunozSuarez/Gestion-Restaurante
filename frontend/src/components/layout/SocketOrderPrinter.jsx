import { useEffect, useRef, useCallback } from 'react';
import { onSocketEvent, getSocketId, isOwnUpdate } from '../../services/socketService';
import printingService from '../../services/printingService';
import printerConfigService from '../../services/printerConfigService';
import { categoriesService } from '../../services/categoriesService';

/**
 * Componente global que escucha TODOS los pedidos creados/actualizados vía Socket.io
 * e imprime automáticamente la comanda de cocina.
 * Se monta en el Layout para que esté siempre activo sin importar la página abierta.
 *
 * Soporta multi-impresora: si hay configuración de roles, envía cada categoría
 * a su impresora correspondiente. Si no, usa la impresora predeterminada.
 *
 * Solo imprime pedidos creados por OTRO cliente (ej: app Flutter).
 * Pedidos creados por este mismo navegador ya se imprimen en ordersService.createOrder().
 */

// Caché de categorías compartido a nivel de módulo
let categoriesCache = null;
let categoriesCacheTimestamp = 0;
const CATEGORIES_CACHE_TTL = 60 * 1000; // 1 minuto

const getCachedCategories = async () => {
  if (categoriesCache && (Date.now() - categoriesCacheTimestamp < CATEGORIES_CACHE_TTL)) {
    return categoriesCache;
  }
  try {
    const response = await categoriesService.getCategories();
    if (response.success && response.categories) {
      categoriesCache = response.categories;
      categoriesCacheTimestamp = Date.now();
      return categoriesCache;
    }
  } catch (err) {
    console.error('Error loading categories for SocketOrderPrinter:', err);
  }
  return categoriesCache || [];
};

const SocketOrderPrinter = () => {
  useEffect(() => {
    const canPrint = () => {
      return printingService.getDefaultPrinter() || printerConfigService.hasMultiPrinterConfig();
    };

    const printOrder = async (order, options = {}) => {
      try {
        const hasMultiConfig = printerConfigService.hasMultiPrinterConfig();
        const categories = hasMultiConfig ? await getCachedCategories() : [];
        await printingService.printKitchenOrder(order, { ...options, categories });
      } catch (err) {
        console.error('Error al imprimir comanda automática:', err);
      }
    };

    const unsubCreated = onSocketEvent('order:created', ({ order, _fromSocketId }) => {
      if (!order) return;
      // Ignorar pedidos creados por este mismo cliente (ya se imprimen en ordersService)
      if (_fromSocketId && _fromSocketId === getSocketId()) return;

      const hasProducts = Array.isArray(order.foods) && order.foods.length > 0;
      if (!hasProducts) return;

      if (canPrint()) {
        printOrder(order);
      }
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order, newFoods, _fromSocketId }) => {
      if (!order) return;
      // Ignorar actualizaciones de este mismo cliente
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (isOwnUpdate(order._id)) return;
      // No imprimir si se está completando/cancelando
      if (order.status === 'Completado' || order.status === 'Cancelado') return;

      // Solo imprimir si hay productos nuevos para agregar
      const hasNewFoods = Array.isArray(newFoods) && newFoods.length > 0;
      if (!hasNewFoods) return;

      if (canPrint()) {
        // Pasar newFoods para que imprima solo los nuevos con asterisco
        printOrder(order, { newFoods });
      }
    });

    const unsubTicket = onSocketEvent('ticket:print', ({ order }) => {
      if (!order) return;
      if (canPrint()) {
        printingService.printCustomerTicket(order).catch((err) => {
          console.error('Error al imprimir ticket solicitado:', err);
        });
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
