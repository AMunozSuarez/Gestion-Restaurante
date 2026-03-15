import api from './api';
import printingService from './printingService';
import { markOwnUpdate } from './socketService';

// ── Caché simple para órdenes (evita re-fetch al cambiar de vista) ──
const orderCache = new Map();
const ORDER_CACHE_TTL = 10 * 1000; // 10 segundos

const getCacheKey = (url) => url;

const getCachedResponse = (key) => {
  const entry = orderCache.get(key);
  if (entry && (Date.now() - entry.timestamp < ORDER_CACHE_TTL)) {
    return entry.data;
  }
  orderCache.delete(key);
  return null;
};

const setCachedResponse = (key, data) => {
  orderCache.set(key, { data, timestamp: Date.now() });
};

// Invalidar caché de órdenes (llamar después de crear/actualizar/eliminar)
const invalidateOrderCache = () => {
  orderCache.clear();
};

export const ordersService = {
  // Obtener todos los pedidos
  getOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Agregar filtros si existen
      if (filters.status) params.append('status', filters.status);
      if (filters.section) params.append('section', filters.section);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const url = `/order/getAll?${params.toString()}`;

      // Intentar caché primero
      const cached = getCachedResponse(getCacheKey(url));
      if (cached) return cached;
      
      const response = await api.get(url);
      setCachedResponse(getCacheKey(url), response.data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedidos');
    }
  },

  // Obtener pedido por ID
  getOrderById: async (id) => {
    try {
      const response = await api.get(`/order/get/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedido');
    }
  },

  // Crear nuevo pedido
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/order/create', orderData);
      invalidateOrderCache(); // Invalidar caché tras crear

      // Solo imprimir si hay productos en el carrito
      const hasProducts = Array.isArray(orderData.foods) && orderData.foods.length > 0;
      if (response.data && response.data.order && hasProducts) {
        try {
          const defaultPrinter = printingService.getDefaultPrinter();
          if (defaultPrinter) {
            await printingService.printKitchenOrder(response.data.order);
          }
        } catch (printError) {
          console.error('Error al imprimir comanda automáticamente:', printError);
          // No lanzamos el error porque el pedido se creó exitosamente
          // Solo logueamos el error de impresión
        }
      }

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear pedido');
    }
  },

  // Actualizar pedido
  updateOrder: async (id, updateData) => {
    try {
      const response = await api.put(`/order/update/${id}`, updateData);
      invalidateOrderCache(); // Invalidar caché tras actualizar
      markOwnUpdate(id); // Evitar doble impresión cuando llega el evento socket
      const isCompleting = updateData.status === 'Completado' || updateData.status === 'completed';
      if (!isCompleting && response.data && response.data.order) {
        try {
          const defaultPrinter = printingService.getDefaultPrinter();
          if (defaultPrinter) {
            await printingService.printKitchenOrder(response.data.order, {
              newFoods: updateData.newFoods || [],
              deletedFoods: updateData.deletedFoods || [],
              allFoods: updateData.allFoods || null
            });
          }
        } catch (printError) {
          console.error('Error al imprimir comanda actualizada automáticamente:', printError);
        }
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar pedido');
    }
  },

  // Actualizar estado del pedido
  updateOrderStatus: async (id, status) => {
    try {
      const response = await api.put(`/order/update/${id}`, { status });
      invalidateOrderCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar estado del pedido');
    }
  },

  // Actualizar pedido completo sin imprimir (para completar/enviar)
  updateOrderWithoutPrint: async (id, updateData) => {
    try {
      const response = await api.put(`/order/update/${id}`, updateData);
      invalidateOrderCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar pedido');
    }
  },

  // Eliminar pedido
  deleteOrder: async (id) => {
    try {
      const response = await api.delete(`/order/delete/${id}`);
      invalidateOrderCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar pedido');
    }
  },

  // Obtener pedidos recientes
  getRecentOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.section) params.append('section', filters.section);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const url = `/order/recent?${params.toString()}`;

      // Intentar caché primero
      const cached = getCachedResponse(getCacheKey(url));
      if (cached) return cached;

      const response = await api.get(url);
      setCachedResponse(getCacheKey(url), response.data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedidos recientes');
    }
  },

  // Obtener pedidos de sección (activos + recientes en una sola llamada)
  getSectionOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.section) params.append('section', filters.section);
      if (filters.recentLimit) params.append('recentLimit', filters.recentLimit);
      if (filters.recentStatuses) params.append('recentStatuses', filters.recentStatuses);

      const url = `/order/section?${params.toString()}`;

      const cached = getCachedResponse(getCacheKey(url));
      if (cached) return cached;

      const response = await api.get(url);
      setCachedResponse(getCacheKey(url), response.data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedidos de sección');
    }
  },

  // Obtener TODAS las ventas del restaurante (para página de ventas)
  getAllSales: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Agregar filtros si existen
      if (filters.status) params.append('status', filters.status);
      if (filters.section) params.append('section', filters.section);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const url = `/order/getAllSales?${params.toString()}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener todas las ventas');
    }
  },

  // Imprimir comanda manualmente
  printOrderKitchen: async (orderId) => {
    try {
      // Primero obtener los datos del pedido
      const orderResponse = await ordersService.getOrderById(orderId);
      
      if (!orderResponse.order) {
        throw new Error('No se pudo obtener los datos del pedido');
      }
      
      // Imprimir la comanda
      const printResponse = await printingService.printKitchenOrder(orderResponse.order);
      
      if (!printResponse.success) {
        throw new Error(printResponse.error);
      }
      
      return { success: true, message: 'Comanda impresa exitosamente' };
    } catch (error) {
      throw new Error(error.message || 'Error al imprimir comanda');
    }
  }
};

export default ordersService;