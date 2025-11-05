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
  }
};

export default cashRegisterService;