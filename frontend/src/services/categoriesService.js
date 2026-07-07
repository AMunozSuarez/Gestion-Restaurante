import api from './api';

export const categoriesService = {
  // Obtener todas las categorías
  getCategories: async (filters = {}) => {
    try {
      const response = await api.get('/category/getAll');
      
      if (response.data.success && response.data.categories) {
        let categories = response.data.categories;
        
        // Si se especifica filtrar solo disponibles
        if (filters.availableOnly || filters.available) {
          categories = categories.filter(category => category.isAvailable);
        }
        
        return {
          ...response.data,
          categories: categories
        };
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener categorías');
    }
  },

  // Buscar categorías por nombre
  searchCategories: async (searchTerm) => {
    try {
      // Obtener todas las categorías primero
      const response = await api.get('/category/getAll');
      
      if (response.data.success && response.data.categories) {
        // Filtrar categorías por nombre
        const filteredCategories = response.data.categories.filter(category => 
          category.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return {
          success: true,
          categories: filteredCategories
        };
      }
      
      return { success: true, categories: [] };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al buscar categorías');
    }
  },

  // Obtener categoría por ID
  getCategoryById: async (id) => {
    try {
      const response = await api.get(`/category/get/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener categoría');
    }
  },

  // Crear nueva categoría
  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/category/create', categoryData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear categoría');
    }
  },

  // Actualizar categoría
  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/category/update/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar categoría');
    }
  },

  // Eliminar categoría
  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/category/delete/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar categoría');
    }
  },

  // Cambiar disponibilidad de la categoría (activar/desactivar)
  toggleCategoryAvailability: async (id, isAvailable) => {
    try {
      const response = await api.put(`/category/update/${id}`, { isAvailable });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al cambiar disponibilidad de la categoría');
    }
  },

  // Actualizar print destinations de múltiples categorías a la vez
  batchUpdatePrintDestinations: async (updates) => {
    try {
      // updates: [{ categoryId: "...", printDestinations: ["cocina", "barra"] }, ...]
      const response = await api.put('/category/print-destinations/batch', { updates });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar destinos de impresión');
    }
  },

  // Reordenar categorías (menú digital)
  reorderCategories: async (items) => {
    try {
      // items: [{ id, order }, ...]
      const response = await api.put('/category/reorder', items);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al reordenar categorías');
    }
  }
};

export default categoriesService;