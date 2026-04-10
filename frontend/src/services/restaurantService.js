import api from './api';

const restaurantService = {
  // Obtener información del restaurante por ID
  getRestaurantById: async (restaurantId) => {
    try {
      const response = await api.get(`/restaurant/get/${restaurantId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener información del restaurante');
    }
  },

  // Obtener información del restaurante del usuario actual
  getCurrentRestaurant: async () => {
    try {
      // Obtener el usuario actual del localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('Usuario no autenticado');
      }

      const user = JSON.parse(userData);
      if (!user.restaurant) {
        throw new Error('Usuario no tiene restaurante asignado');
      }

      return await restaurantService.getRestaurantById(user.restaurant);
    } catch (error) {
      throw new Error(error.message || 'Error al obtener información del restaurante');
    }
  },

  // Obtener configuración compartida del restaurante actual
  getMyRestaurantSettings: async () => {
    try {
      const response = await api.get('/restaurant/settings/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener configuración del restaurante');
    }
  },

  // Actualizar configuración compartida del restaurante actual
  updateMyRestaurantSettings: async (payload) => {
    try {
      const response = await api.put('/restaurant/settings/me', payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar configuración del restaurante');
    }
  }
};

export default restaurantService;