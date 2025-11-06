import api from './api';

export const productsService = {
  // Obtener todos los productos
  getProducts: async (filters = {}) => {
    try {
      const response = await api.get('/food/getAll');
      
      if (response.data.success && response.data.foods) {
        let products = response.data.foods;
        
        // Si se especifica filtrar solo disponibles (para crear pedidos)
        if (filters.availableOnly || filters.available) {
          products = products.filter(product => product.isAvailable);
        }
        
        return {
          ...response.data,
          foods: products
        };
      }
      
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
        // Filtrar productos por nombre Y que estén disponibles
        const filteredProducts = response.data.foods.filter(product => 
          product.isAvailable && ( // Solo productos disponibles
            product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase())
          )
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
            imageUrl: food.imageUrl
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

  // Crear nuevo producto
  createProduct: async (productData) => {
    try {
      const response = await api.post('/food/create', productData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear producto');
    }
  },

  // Actualizar producto
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/food/update/${id}`, productData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar producto');
    }
  },

  // Cambiar disponibilidad del producto (activar/desactivar)
  toggleProductAvailability: async (id, isAvailable) => {
    try {
      const response = await api.put(`/food/update/${id}`, { isAvailable });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al cambiar disponibilidad del producto');
    }
  },

  // Obtener categorías (solo activas para el formulario de productos)
  getCategories: async (activeOnly = false) => {
    try {
      const response = await api.get('/category/getAll');
      
      if (response.data.success && response.data.categories) {
        let categories = response.data.categories;
        
        // Si se solicitan solo categorías activas
        if (activeOnly) {
          categories = categories.filter(category => category.isAvailable);
        }
        
        return {
          ...response.data,
          categories
        };
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener categorías');
    }
  }
};

export default productsService;