import api from './api';

export const cashRegisterService = {
  // Obtener estado de la caja registradora actual
  getCashRegisterStatus: async () => {
    try {
      const response = await api.get('/cash/current');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener estado de caja');
    }
  },

  // Abrir caja registradora (crear nueva)
  openCashRegister: async (data) => {
    try {
      const response = await api.post('/cash/create', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al abrir caja');
    }
  },

  // Cerrar caja registradora
  closeCashRegister: async (data) => {
    try {
      const response = await api.put('/cash/close', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al cerrar caja');
    }
  },

  // Obtener información de la caja actual (mismo que getCashRegisterStatus)
  getCurrentCashRegister: async () => {
    try {
      const response = await api.get('/cash/current');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener caja actual');
    }
  },

  // Obtener todas las cajas registradoras
  getAllCashRegisters: async () => {
    try {
      const response = await api.get('/cash/cashRegister');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener todas las cajas');
    }
  },

  // Obtener detalle de una caja específica por ID
  getCashRegisterById: async (id) => {
    try {
      const response = await api.get(`/cash/cashRegister/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener detalle de la caja');
    }
  },

  // Agregar pedido completado a la caja registradora actual
  addOrderToCashRegister: async (orderData) => {
    try {
      const response = await api.post('/cash/add-order', orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al agregar pedido a la caja');
    }
  }
};

export default cashRegisterService;