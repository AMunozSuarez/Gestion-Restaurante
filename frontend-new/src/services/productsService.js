import api from './api';

export const productsService = {
  // Obtener todos los productos
  getProducts: async (filters = {}) => {
    try {
      const response = await api.get('/food/getAll');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener productos');
    }
  },

  // Buscar productos por nombre (búsqueda local en frontend)
  searchProducts: async (searchTerm) => {
    try {
      // Obtener todos los productos primero
      const response = await api.get('/food/getAll');
      
      if (response.data.success && response.data.foods) {
        // Filtrar productos por nombre en el frontend
        const filteredProducts = response.data.foods.filter(product => 
          product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return {
          success: true,
          products: filteredProducts.map(food => ({
            id: food._id,
            name: food.title,
            description: food.description,
            price: food.price,
            category: food.category,
            isAvailable: food.isAvailable,
            imageUrl: food.imageUrl,
            foodTags: food.foodTags
          }))
        };
      }
      
      return { success: true, products: [] };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al buscar productos');
    }
  },

  // Obtener producto por ID
  getProductById: async (id) => {
    try {
      const response = await api.get(`/food/get/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener producto');
    }
  },

  // Obtener categorías
  getCategories: async () => {
    try {
      const response = await api.get('/category/getAll');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener categorías');
    }
  }
};

export default productsService;