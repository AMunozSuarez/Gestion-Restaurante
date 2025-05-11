import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../services/axiosConfig';

export const useCustomerSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);

  // Función para buscar clientes basados en un término de búsqueda
  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Usar la URL exacta que has verificado que funciona
      const response = await axios.get(`/customer/search?query=${encodeURIComponent(query)}`);
      
      // Manejar diferentes formatos de respuesta
      const customers = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.customers || []);
        
      setSuggestions(customers);
    } catch (err) {
      console.error('Error al buscar clientes:', err);
      setError('Error al buscar clientes. Intente nuevamente.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Gestión de la búsqueda con debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // No realizar búsquedas si el usuario está ingresando un número de teléfono nuevo
    // Solo buscar si la entrada tiene al menos 3 caracteres
    if (searchQuery && searchQuery.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        searchCustomers(searchQuery);
      }, 300); // Esperar 300ms para evitar demasiadas solicitudes
    } else {
      // Limpiar sugerencias si la consulta es muy corta
      setSuggestions([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchCustomers]);

  return {
    searchQuery,
    setSearchQuery,
    suggestions,
    isLoading,
    error,
    clearSuggestions: () => setSuggestions([])
  };
};