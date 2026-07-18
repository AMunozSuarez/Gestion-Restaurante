import api from './api';

// Caché para productos
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

export const productsService = {
  // Obtener todos los productos
  getProducts: async (filters = {}) => {
    try {
      // Usar caché si es válido (evita re-fetch al cambiar de vista)
      const now = Date.now();
      const isCacheValid = productsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION);

      if (isCacheValid) {
        let products = productsCache;
        if (filters.availableOnly || filters.available) {
          products = products.filter(product => product.isAvailable);
        }
        return { success: true, foods: products };
      }

      const response = await api.get('/food/getAll');
      
      if (response.data.success && response.data.foods) {
        // Actualizar el caché con los productos obtenidos
        productsCache = response.data.foods;
        cacheTimestamp = Date.now();
        
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

  // Buscar productos por nombre (búsqueda local usando caché)
  searchProducts: async (searchTerm) => {
    try {
      // Verificar si el caché existe y es válido
      const now = Date.now();
      const isCacheValid = productsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION);
      
      // Si no hay caché válido, obtener productos del servidor
      if (!isCacheValid) {
        const response = await api.get('/food/getAll');
        
        if (response.data.success && response.data.foods) {
          productsCache = response.data.foods;
          cacheTimestamp = now;
        } else {
          throw new Error('No se pudieron obtener los productos');
        }
      } 
      
      // Filtrar productos desde el caché
      const filteredProducts = productsCache.filter(product => 
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
          imageUrl: food.imageUrl,
          extraSections: food.extraSections || [] // ✅ Agregar extraSections
        }))
      };
      
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al buscar productos');
    }
  },

  // Función para limpiar el caché (útil cuando se actualiza un producto)
  clearCache: () => {
    productsCache = null;
    cacheTimestamp = null;
  },

  // Función para verificar si el caché es válido
  isCacheValid: () => {
    const now = Date.now();
    return productsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION);
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
      
      // Limpiar caché cuando se crea un producto
      if (response.data.success) {
        productsService.clearCache();
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear producto');
    }
  },

  // Actualizar producto
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/food/update/${id}`, productData);
      
      // Limpiar caché cuando se actualiza un producto
      if (response.data.success) {
        productsService.clearCache();
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar producto');
    }
  },

  // Cambiar disponibilidad del producto (activar/desactivar)
  toggleProductAvailability: async (id, isAvailable) => {
    try {
      const response = await api.put(`/food/update/${id}`, { isAvailable });
      
      // Limpiar caché cuando se cambia la disponibilidad
      if (response.data.success) {
        productsService.clearCache();
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al cambiar disponibilidad del producto');
    }
  },

  // Subir imagen de producto (optimizada en el backend)
  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/food/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al subir la imagen');
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