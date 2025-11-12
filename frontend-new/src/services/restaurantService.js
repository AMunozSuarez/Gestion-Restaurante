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
  }
};

export default restaurantService;