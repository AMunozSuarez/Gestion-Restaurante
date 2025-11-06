import { useState, useEffect } from 'react';
import categoriesService from '../services/categoriesService';

export const useCategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Obtener categorías
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await categoriesService.getCategories();
      
      if (response.success && response.categories) {
        const mappedCategories = response.categories.map(category => ({
          id: category._id,
          title: category.title,
          isAvailable: category.isAvailable,
          restaurant: category.restaurant,
          productCount: category.productCount || 0,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }));
        setCategories(mappedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      setError(error.message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear categoría
  const createCategory = async (categoryData) => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await categoriesService.createCategory(categoryData);
      
      if (response.success) {
        await fetchCategories(); // Actualizar lista
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

  // Actualizar categoría
  const updateCategory = async (id, categoryData) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await categoriesService.updateCategory(id, categoryData);
      
      if (response.success) {
        await fetchCategories(); // Actualizar lista
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

  // Eliminar categoría
  const deleteCategory = async (id) => {
    try {
      setIsDeleting(true);
      setError(null);
      const response = await categoriesService.deleteCategory(id);
      
      if (response.success) {
        await fetchCategories(); // Actualizar lista
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsDeleting(false);
    }
  };

  // Cambiar disponibilidad de categoría
  const toggleCategoryAvailability = async (id, isAvailable) => {
    try {
      setError(null);
      
      // Encontrar la categoría actual para obtener su título
      const currentCategory = categories.find(cat => cat.id === id);
      if (!currentCategory) {
        throw new Error('Categoría no encontrada');
      }

      const response = await categoriesService.updateCategory(id, {
        title: currentCategory.title,
        isAvailable
      });
      
      if (response.success) {
        // Actualizar el estado local inmediatamente
        setCategories(prevCategories =>
          prevCategories.map(category =>
            category.id === id ? { ...category, isAvailable } : category
          )
        );
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Refrescar categorías
  const refreshCategories = () => {
    fetchCategories();
  };

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryAvailability,
    refreshCategories,
    fetchCategories
  };
};

export default useCategoriesManagement;