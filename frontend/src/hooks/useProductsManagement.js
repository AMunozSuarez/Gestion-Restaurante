import { useState, useEffect } from 'react';
import productsService from '../services/productsService';

export const useProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Obtener productos
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productsService.getProducts();
      
      if (response.success && response.foods) {
        const mappedProducts = response.foods.map(food => ({
          id: food._id,
          title: food.title,
          name: food.title, // Para compatibilidad
          description: food.description,
          price: food.price,
          category: food.category,
          isAvailable: food.isAvailable,
          imageUrl: food.imageUrl,
          createdAt: food.createdAt,
          updatedAt: food.updatedAt
        }));
        setProducts(mappedProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      setError(error.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener categorías (solo activas para formularios)
  const fetchCategories = async (activeOnly = true) => {
    try {
      const response = await productsService.getCategories(activeOnly);
      if (response.success && response.categories) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Error al obtener categorías:', error);
    }
  };

  // Crear producto
  const createProduct = async (productData) => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await productsService.createProduct(productData);
      
      if (response.success) {
        await fetchProducts(); // Actualizar lista
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  // Actualizar producto
  const updateProduct = async (id, productData) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await productsService.updateProduct(id, productData);
      
      if (response.success) {
        await fetchProducts(); // Actualizar lista
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUpdating(false);
    }
  };

  // Cambiar disponibilidad del producto
  const toggleProductAvailability = async (id, isAvailable) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await productsService.toggleProductAvailability(id, isAvailable);
      
      if (response.success) {
        await fetchProducts(); // Actualizar lista
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUpdating(false);
    }
  };

  // Inicializar datos
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  return {
    // Estados
    products,
    categories,
    isLoading,
    error,
    isCreating,
    isUpdating,
    
    // Métodos
    createProduct,
    updateProduct,
    toggleProductAvailability,
    refreshProducts: fetchProducts,
    refreshCategories: fetchCategories
  };
};

export default useProductsManagement;