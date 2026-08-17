import { useEffect } from 'react';
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
        return await printingService.printKitchenOrder(order, { ...options, categories });
      } catch (err) {
        console.error('Error al imprimir comanda automática:', err);
        return { success: false, error: err.message };
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

    const unsubUpdated = onSocketEvent('order:updated', async ({ order, newFoods, deletedFoods, _fromSocketId }) => {
      if (!order) return;
      const orderId = order._id || order.id;
      // Ignorar actualizaciones de este mismo cliente
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (isOwnUpdate(orderId)) return;
      // No imprimir si se está completando/cancelando
      if (order.status === 'Completado' || order.status === 'Cancelado') return;

      const hasNewFoods = Array.isArray(newFoods) && newFoods.length > 0;
      const rawDeletedFoods = Array.isArray(deletedFoods) ? deletedFoods : [];
      const deletedFoodsToPrint = printingService.getUnprintedDeletedFoodsForOrder(orderId, rawDeletedFoods);
      const shouldPrintDeletedUpdates = printingService.getPrintOnDeletedItemsUpdate() && deletedFoodsToPrint.length > 0;
      if (!hasNewFoods && !shouldPrintDeletedUpdates) return;

      if (canPrint()) {
        // 1) Comanda de actualización para productos nuevos
        const newFoodsPrintOptions = { newFoods: newFoods || [], deletedFoods: [], forceNewOnly: true };
        if (hasNewFoods && !printingService.shouldSkipDuplicateKitchenUpdatePrint(orderId, newFoodsPrintOptions)) {
          const newFoodsPrintResult = await printOrder(order, newFoodsPrintOptions);
          if (newFoodsPrintResult?.success) {
            printingService.markKitchenUpdatePrint(orderId, newFoodsPrintOptions);
          }
        }

        // 2) Comanda de cancelación separada para productos eliminados
        if (shouldPrintDeletedUpdates) {
          const cancelPrintResult = await printingService.printKitchenCancellationOrder(order, {
            deletedFoods: deletedFoodsToPrint,
          });
          if (cancelPrintResult?.success) {
            printingService.markDeletedFoodsPrintedForOrder(orderId, deletedFoodsToPrint);
          }
        }
      }
    });

    const unsubTicket = onSocketEvent('ticket:print', ({ order, _fromSocketId }) => {
      if (!order) return;
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (!printingService.getRemotePrintEnabled()) return;
      if (canPrint()) {
        printingService.printCustomerTicket(order).catch((err) => {
          console.error('Error al imprimir ticket solicitado:', err);
        });
      }
    });

    const unsubCashRegisterReport = onSocketEvent('cashregister:print', ({ cashRegister, systemTotalsByPayment, tipsStatistics, _fromSocketId }) => {
      if (!cashRegister) return;
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (!printingService.getRemotePrintEnabled()) return;
      if (canPrint()) {
        printingService.printCashRegisterReport(cashRegister, systemTotalsByPayment || {}, tipsStatistics || null).catch((err) => {
          console.error('Error al imprimir reporte de caja solicitado:', err);
        });
      }
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubTicket();
      unsubCashRegisterReport();
    };
  }, []);

  return null;
};

export default SocketOrderPrinter;
