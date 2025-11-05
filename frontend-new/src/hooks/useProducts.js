import { useState, useEffect } from 'react';
import productsService from '../services/productsService';

// Hook para obtener productos
export const useProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productsService.getProducts(filters);
      
      if (response.success && response.foods) {
        // Mapear la estructura del backend a la estructura esperada en el frontend
        const mappedProducts = response.foods.map(food => ({
          id: food._id,
          name: food.title,
          description: food.description,
          price: food.price,
          category: food.category,
          isAvailable: food.isAvailable,
          imageUrl: food.imageUrl,
          foodTags: food.foodTags
        }));
        setProducts(mappedProducts);
      } else {
        setProducts([]);
        setError(response.message || 'No se pudieron obtener los productos');
      }
    } catch (error) {
      setError(error.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [JSON.stringify(filters)]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts
  };
};

// Hook para buscar productos por nombre
export const useProductSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const searchProducts = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);
      const response = await productsService.searchProducts(searchTerm);
      
      if (response.success) {
        setSearchResults(response.products || []);
      } else {
        setSearchResults([]);
        setSearchError(response.message || 'No se pudieron buscar los productos');
      }
    } catch (error) {
      setSearchError(error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchResults,
    isSearching,
    searchError,
    searchProducts
  };
};