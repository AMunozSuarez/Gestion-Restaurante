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

  // Obtener ventas de la caja registradora activa actual
  getCurrentCashRegisterSales: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const url = `/cash/sales${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener ventas de la caja actual');
    }
  },

  // Obtener ventas de una caja registradora específica
  getCashRegisterSales: async (cashRegisterId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const url = `/cash/sales/${cashRegisterId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener ventas de la caja específica');
    }
  }
};

export default cashRegisterService;