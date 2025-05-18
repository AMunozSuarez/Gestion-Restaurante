import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../services/axiosConfig';

export const useCustomerSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);
  // Cache para evitar búsquedas duplicadas
  const customerCache = useRef(new Map());

  // Función para buscar clientes
  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Buscando clientes en usecustomerSearch.js');
      const response = await axios.get(`/customer/search?query=${encodeURIComponent(query)}`);
      
      console.log('Respuesta del servidor:', response.data);
      
      // Manejar diferentes formatos de respuesta
      const customers = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.customers || []);
        
      setSuggestions(customers);
      console.log(`Se encontraron ${customers.length} clientes`);
    } catch (err) {
      console.error('Error al buscar clientes:', err);
      
      // Mostrar mensaje detallado
      const errorMsg = err.response?.data?.message || 'Error al buscar clientes';
      setError(`${errorMsg}. ${err.response?.status === 401 ? 'Verifica tu sesión.' : ''}`);
      
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Obtener un cliente por teléfono
  const getCustomerByPhone = useCallback(async (phone) => {
    if (!phone) return null;
    
    // Revisar caché primero
    if (customerCache.current.has(phone)) {
      console.log('[CACHED] Usando cliente en caché para:', phone);
      return customerCache.current.get(phone);
    }
    
    try {
      setIsLoading(true);
      const response = await axios.get(`/customer/getByPhone?phone=${encodeURIComponent(phone)}`);
      setIsLoading(false);
      
      const customer = response.data?.customer || null;
      
      // Guardar en caché
      if (customer) {
        customerCache.current.set(phone, customer);
      }
      
      return customer;
    } catch (error) {
      console.error('Error al obtener cliente por teléfono:', error);
      setIsLoading(false);
      return null;
    }
  }, []);
  
  // Función centralizada para buscar cliente por telefono (compatible con OrderFormDelivery)
  const fetchCustomerData = useCallback(async (phone, deliveryAddress = '', deliveryCost = '') => {
    if (!phone) return null;
    
    try {
      setIsLoading(true);
      
      // Revisar caché primero
      if (customerCache.current.has(phone)) {
        console.log('[CACHED] Usando cliente en caché para fetchCustomerData:', phone);
        setIsLoading(false);
        return customerCache.current.get(phone);
      }
      
      console.log("[useCustomerSearch] Buscando cliente en el servidor:", phone);
      const response = await axios.get(`/customer/search?query=${phone}`);
      console.log("[useCustomerSearch] Respuesta del servidor:", response.data);
      
      if (response.data?.success && response.data?.customers?.length > 0) {
        // Encontrar el cliente exacto con el mismo teléfono
        const exactCustomer = response.data.customers.find(c => c.phone === phone);
        
        if (exactCustomer) {
          console.log("[useCustomerSearch] Cliente encontrado:", exactCustomer);
          
          // Agregar dirección temporal si es necesario
          if (deliveryAddress && exactCustomer.addresses) {
            const addressExists = exactCustomer.addresses.some(addr => addr.address === deliveryAddress);
            
            if (!addressExists && deliveryAddress) {
              exactCustomer.addresses = [...exactCustomer.addresses, {
                address: deliveryAddress,
                deliveryCost: Number(deliveryCost) || 0,
                _isTemporary: true
              }];
            }
          }
          
          // Guardar en caché
          customerCache.current.set(phone, exactCustomer);
          setIsLoading(false);
          return exactCustomer;
        }
      }
      
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error("[useCustomerSearch] Error al buscar cliente:", error);
      setIsLoading(false);
      return null;
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
    clearSuggestions: () => setSuggestions([]),
    getCustomerByPhone,
    fetchCustomerData,
    clearCache: () => customerCache.current.clear()
  };
};