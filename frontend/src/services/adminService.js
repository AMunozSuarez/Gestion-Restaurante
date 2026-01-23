import api from './api';

const adminService = {
  // =================== USUARIOS ===================
  // Obtener todos los usuarios
  getAllUsers: async (params = {}) => {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios');
    }
  },

  // Crear un nuevo usuario
  createUser: async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear usuario');
    }
  },

  // Actualizar usuario
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
    }
  },

  // Eliminar usuario
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  },

  // =================== RESTAURANTES ===================
  // Obtener todos los restaurantes
  getAllRestaurants: async (params = {}) => {
    try {
      const response = await api.get('/admin/restaurants', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener restaurantes');
    }
  },

  // Crear un nuevo restaurante
  createRestaurant: async (restaurantData) => {
    try {
      const response = await api.post('/admin/restaurants', restaurantData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear restaurante');
    }
  },

  // Actualizar restaurante
  updateRestaurant: async (restaurantId, restaurantData) => {
    try {
      const response = await api.put(`/admin/restaurants/${restaurantId}`, restaurantData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar restaurante');
    }
  },

  // Eliminar restaurante
  deleteRestaurant: async (restaurantId) => {
    try {
      const response = await api.delete(`/admin/restaurants/${restaurantId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar restaurante');
    }
  },

  // =================== ESTADÍSTICAS ===================
  // Obtener estadísticas del sistema
  getSystemStats: async () => {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener estadísticas');
    }
  },

  // =================== MANTENIMIENTO ===================
  // Verificar suscripciones expiradas
  checkExpiredSubscriptions: async () => {
    try {
      const response = await api.post('/admin/subscriptions/check-expired');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al verificar suscripciones');
    }
  },

  // Enviar recordatorios de vencimiento
  sendExpirationReminders: async () => {
    try {
      const response = await api.post('/admin/subscriptions/send-reminders');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al enviar recordatorios');
    }
  },
};

export default adminService;
