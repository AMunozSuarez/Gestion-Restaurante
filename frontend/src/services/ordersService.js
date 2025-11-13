import api from './api';
import printingService from './printingService';

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
      
      const response = await api.get(url);
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
      
      // Intentar imprimir comanda automáticamente si hay impresora predeterminada
      if (response.data && response.data.order) {
        try {
          const defaultPrinter = printingService.getDefaultPrinter();
          if (defaultPrinter) {
            await printingService.printKitchenOrder(response.data.order);
          }
        } catch (printError) {
          console.error('Error al imprimir comanda actualizada automáticamente:', printError);
          // No lanzamos el error porque el pedido se actualizó exitosamente
          // Solo logueamos el error de impresión
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
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar estado del pedido');
    }
  },

  // Actualizar pedido completo sin imprimir (para completar/enviar)
  updateOrderWithoutPrint: async (id, updateData) => {
    try {
      const response = await api.put(`/order/update/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar pedido');
    }
  },

  // Eliminar pedido
  deleteOrder: async (id) => {
    try {
      const response = await api.delete(`/order/delete/${id}`);
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

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedidos recientes');
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