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
      console.log('Llamando al backend:', url);
      console.log('Filtros enviados:', filters);
      
      const response = await api.get(url);
      console.log('Respuesta del backend - Total pedidos:', response.data?.orders?.length);
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
      
      // Intentar imprimir comanda automáticamente si hay impresora predeterminada
      if (response.data && response.data.order) {
        try {
          const defaultPrinter = printingService.getDefaultPrinter();
          if (defaultPrinter) {
            console.log('Imprimiendo comanda automáticamente para pedido:', response.data.order.id);
            await printingService.printKitchenOrder(response.data.order);
            console.log('Comanda impresa exitosamente');
          } else {
            console.log('No hay impresora predeterminada configurada - no se imprime comanda');
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
            console.log('Imprimiendo comanda actualizada automáticamente para pedido:', response.data.order.id);
            await printingService.printKitchenOrder(response.data.order);
            console.log('Comanda actualizada impresa exitosamente');
          } else {
            console.log('No hay impresora predeterminada configurada - no se imprime comanda actualizada');
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
      console.log('Llamando pedidos recientes:', url);
      console.log('Filtros para pedidos recientes:', filters);

      const response = await api.get(url);
      console.log('Respuesta pedidos recientes - Total:', response.data?.orders?.length);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener pedidos recientes');
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