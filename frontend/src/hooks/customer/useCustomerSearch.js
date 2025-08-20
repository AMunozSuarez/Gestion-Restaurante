import { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../services/axiosConfig';

export const useCustomerSearch = () => {
  // Estados para la búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para el cliente seleccionado
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  
  // Estados para la gestión de direcciones
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [originalAddress, setOriginalAddress] = useState(null);
  
  // Referencias para control
  const debounceTimerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Función para buscar clientes para autocompletado
  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Ejecutando búsqueda de clientes en useCustomerSearch.js');
      const response = await axios.get(`/customer/search?query=${encodeURIComponent(query)}`);
      
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

  // Función para crear cliente temporal
  const createTemporaryCustomer = useCallback((name = '', phone = '', deliveryAddress = '', deliveryCost = '') => {
    const tempCustomer = {
      name: name,
      phone: phone,
      addresses: deliveryAddress ? [{
        address: deliveryAddress,
        deliveryCost: Number(deliveryCost) || 0
      }] : [],
      _isTemporary: true
    };
    
    console.log("[useCustomerSearch] Creando cliente temporal:", tempCustomer);
    setSelectedCustomer(tempCustomer);
    setCustomerAddresses(tempCustomer.addresses);
    return tempCustomer;
  }, []);

  // Función completa para buscar cliente por teléfono
  const fetchCustomerData = useCallback(async (phone, deliveryAddress = '', deliveryCost = '', customerName = '') => {
    if (!phone) {
      setSelectedCustomer(null);
      setCustomerAddresses([]);
      return null;
    }
    
    // Evitar búsquedas duplicadas
    if (isFetchingRef.current) {
      console.log("[useCustomerSearch] Ya hay una búsqueda en curso, omitiendo");
      return null;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      
      console.log("[useCustomerSearch] Buscando cliente en el servidor:", phone);
      const response = await axios.get(`/customer/search?query=${phone}`);
      
      if (response.data?.success && response.data?.customers?.length > 0) {
        // Encontrar el cliente exacto con el mismo teléfono
        const exactCustomer = response.data.customers.find(c => c.phone === phone);
        
        if (exactCustomer) {
          console.log("[useCustomerSearch] Cliente encontrado:", exactCustomer);
          setSelectedCustomer(exactCustomer);
          
          // Cargar las direcciones del cliente
          if (exactCustomer.addresses && exactCustomer.addresses.length > 0) {
            // Si hay una dirección específica, verificar si ya existe en el cliente
            if (deliveryAddress) {
              const addressExists = exactCustomer.addresses.some(
                addr => addr.address === deliveryAddress
              );
              
              if (!addressExists) {
                // Si la dirección no existe, agregar temporalmente
                const newAddresses = [...exactCustomer.addresses, {
                  address: deliveryAddress,
                  deliveryCost: Number(deliveryCost) || 0,
                  _isTemporary: true
                }];
                setCustomerAddresses(newAddresses);
              } else {
                setCustomerAddresses(exactCustomer.addresses);
              }
            } else {
              setCustomerAddresses(exactCustomer.addresses);
            }
          } else if (deliveryAddress) {
            // Si el cliente no tiene direcciones pero se proporciona una
            setCustomerAddresses([{
              address: deliveryAddress,
              deliveryCost: Number(deliveryCost) || 0
            }]);
          } else {
            setCustomerAddresses([]);
          }
          
          return exactCustomer;
        }
      }
      
      // Si no se encontró cliente pero tenemos información parcial, crear uno temporal
      if (phone) {
        const tempCustomer = createTemporaryCustomer(customerName, phone, deliveryAddress, deliveryCost);
        return tempCustomer;
      }
      
      setSelectedCustomer(null);
      setCustomerAddresses([]);
      return null;
    } catch (error) {
      console.error("[useCustomerSearch] Error al buscar cliente:", error);
      
      // Si hay error pero tenemos información mínima, crear temporal
      if (phone) {
        const tempCustomer = createTemporaryCustomer(customerName, phone, deliveryAddress, deliveryCost);
        return tempCustomer;
      }
      
      setSelectedCustomer(null);
      setCustomerAddresses([]);
      return null;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [createTemporaryCustomer]);

  // Función para manejar la selección de cliente con todos los parámetros
  const handleCustomerSelect = useCallback(async (customerData, callbacks) => {
    const { setCustomerName, setCustomerPhone, setDeliveryAddress, setDeliveryCost, setComment } = callbacks || {};
    
    // Siempre actualizar el teléfono, que viene en todas las llamadas
    if (setCustomerPhone && customerData?.phone !== undefined) {
      setCustomerPhone(customerData.phone || '');
    }
    
    // Si se limpió la selección o no hay datos
    if (!customerData || !customerData.phone) {
      // Limpiar todos los campos si no hay cliente
      console.log('limiezando campos AAAAAAAAAAAAAAAAAAAA');
      if (setCustomerName) setCustomerName('');
      if (setComment) setComment('');
      if (setDeliveryAddress) setDeliveryAddress('');
      if (setDeliveryCost) setDeliveryCost('');
      setCustomerAddresses([]);
      setSelectedCustomer(null);
      setIsAddingNewAddress(false);
      setIsEditingAddress(false);
      return null;
    }
    
    // Si solo tenemos el teléfono, buscar datos completos
    if (Object.keys(customerData).length === 1 && customerData.phone) {
      if (!isFetchingRef.current) {
        console.log("[DEBUG] handleCustomerSelect - Buscando cliente por teléfono:", customerData.phone);
        const foundCustomer = await fetchCustomerData(customerData.phone);
        
        if (foundCustomer) {
          // Actualizar campos con los datos del cliente encontrado
          if (setCustomerName) setCustomerName(foundCustomer.name || '');
          if (setComment) setComment(foundCustomer.comment || '');
          
          // Si tiene direcciones, seleccionar la primera
          if (foundCustomer.addresses && foundCustomer.addresses.length > 0) {
            if (setDeliveryAddress) setDeliveryAddress(foundCustomer.addresses[0].address || '');
            if (setDeliveryCost) setDeliveryCost(foundCustomer.addresses[0].deliveryCost?.toString() || '0');
            setIsAddingNewAddress(false);
          } else {
            // Si no tiene direcciones, activar modo de nueva dirección
            if (setDeliveryAddress) setDeliveryAddress('');
            if (setDeliveryCost) setDeliveryCost('');
            setIsAddingNewAddress(true);
          }
          
          return foundCustomer;
        } else {
          // Cliente no encontrado, limpiar campos excepto teléfono
          if (setCustomerName) setCustomerName('');
          if (setDeliveryAddress) setDeliveryAddress('');
          if (setDeliveryCost) setDeliveryCost('');
          setIsAddingNewAddress(true);
          
          return null;
        }
      } else {
        console.log("[DEBUG] handleCustomerSelect - Ya hay una búsqueda en curso, omitiendo");
        return null;
      }
    }
    
    // Si ya tenemos los datos completos del cliente (desde el autocomplete)
    console.log("[DEBUG] handleCustomerSelect - Cliente seleccionado con datos completos:", customerData);
    setSelectedCustomer(customerData);
    
    // Actualizar el resto de campos
    if (setCustomerName) setCustomerName(customerData.name || '');
    if (setComment) setComment(customerData.comment || '');
    
    // Manejar direcciones
    if (customerData.addresses && customerData.addresses.length > 0) {
      setCustomerAddresses(customerData.addresses);
      if (setDeliveryAddress) setDeliveryAddress(customerData.addresses[0].address);
      if (setDeliveryCost) setDeliveryCost(customerData.addresses[0].deliveryCost?.toString() || '0');
      setIsAddingNewAddress(false);
      setIsEditingAddress(false);
    } else {
      setCustomerAddresses([]);
      if (setDeliveryAddress) setDeliveryAddress('');
      if (setDeliveryCost) setDeliveryCost('');
      setIsAddingNewAddress(true);
    }
    
    return customerData;
  }, [fetchCustomerData]);

  // Función para manejar cambio de dirección en selector
  const handleAddressChange = useCallback((selectedValue, callbacks) => {
    const { setDeliveryAddress, setDeliveryCost } = callbacks || {};
    console.log('[DEBUG] handleAddressChange - Valor seleccionado:', selectedValue);
    
    if (selectedValue === 'new') {
      // Activar modo de nueva dirección
      setIsAddingNewAddress(true);
      setIsEditingAddress(false);
      if (setDeliveryAddress) setDeliveryAddress('');
      if (setDeliveryCost) setDeliveryCost('');
      
      return { action: 'new', address: null };
    } else {
      // Desactivar modo de nueva dirección
      setIsAddingNewAddress(false);
      setIsEditingAddress(false);
      
      // Buscar la dirección seleccionada entre las opciones
      const selectedAddress = customerAddresses.find(addr => addr.address === selectedValue);
      if (selectedAddress) {
        if (setDeliveryAddress) setDeliveryAddress(selectedAddress.address);
        if (setDeliveryCost) setDeliveryCost(selectedAddress.deliveryCost?.toString() || '0');
        
        return { action: 'select', address: selectedAddress };
      }
    }
    
    return { action: 'none', address: null };
  }, [customerAddresses]);

  // Función para iniciar edición de dirección
  const startEditingAddress = useCallback((currentAddress, currentCost) => {
    console.log('[DEBUG] startEditingAddress - Iniciando edición de dirección:', currentAddress);
    
    setIsEditingAddress(true);
    setIsAddingNewAddress(false);
    
    // Guardar el objeto completo de la dirección original
    const currentAddressObj = customerAddresses.find(addr => addr.address === currentAddress);
    
    if (currentAddressObj) {
      console.log("[DEBUG] Guardando dirección original para edición:", currentAddressObj);
      setOriginalAddress(currentAddressObj);
    } else {
      console.log("[DEBUG] No se encontró objeto de dirección, creando nuevo:", currentAddress);
      setOriginalAddress({
        address: currentAddress,
        deliveryCost: Number(currentCost) || 0
      });
    }
    
    return { 
      isEditing: true, 
      originalAddress: currentAddressObj || { 
        address: currentAddress, 
        deliveryCost: Number(currentCost) || 0 
      } 
    };
  }, [customerAddresses]);

  // Función para cancelar edición de dirección
  const cancelAddressAction = useCallback((callbacks) => {
    const { setDeliveryAddress, setDeliveryCost } = callbacks || {};
    console.log('[DEBUG] cancelAddressAction - Cancelando edición de dirección');
    
    setIsEditingAddress(false);
    setIsAddingNewAddress(false);
    
    // Restaurar dirección original si existe
    if (originalAddress) {
      if (setDeliveryAddress) setDeliveryAddress(originalAddress.address || '');
      if (setDeliveryCost) setDeliveryCost(originalAddress.deliveryCost?.toString() || '0');
      return originalAddress;
    } 
    
    // Si no hay dirección original pero hay otras direcciones, usar la primera
    if (customerAddresses.length > 0) {
      if (setDeliveryAddress) setDeliveryAddress(customerAddresses[0].address);
      if (setDeliveryCost) setDeliveryCost(customerAddresses[0].deliveryCost?.toString() || '0');
      return customerAddresses[0];
    }
    
    return null;
  }, [originalAddress, customerAddresses]);

  // Función para preparar datos del cliente para un pedido
  const prepareCustomerDataForOrder = useCallback((formData) => {
    const { customerName, customerPhone, deliveryAddress, deliveryCost, comment } = formData;
    
    let customerData = {
      name: customerName,
      phone: customerPhone,
      comment: comment || '',
    };
    
    // Si hay dirección, añadirla a las direcciones del cliente
    if (deliveryAddress) {
      const addressData = {
        address: deliveryAddress,
        deliveryCost: Number(deliveryCost) || 0,
      };
      
      // Si el cliente tiene direcciones anteriores, gestionar correctamente
      if (selectedCustomer && selectedCustomer.addresses) {
        const existingAddresses = [...selectedCustomer.addresses];
        
        // Verificar si ya existe esta dirección
        const existingIndex = existingAddresses.findIndex(
          a => a.address === deliveryAddress
        );
        
        if (existingIndex >= 0) {
          // Actualizar el costo si cambió
          existingAddresses[existingIndex].deliveryCost = Number(deliveryCost) || 0;
        } else {
          // Agregar nueva dirección
          existingAddresses.push(addressData);
        }
        
        customerData.addresses = existingAddresses;
      } else {
        customerData.addresses = [addressData];
      }
    }
    
    return customerData;
  }, [selectedCustomer]);

  // Función para resetear estados de dirección
  const resetAddressStates = useCallback(() => {
    setIsAddingNewAddress(false);
    setIsEditingAddress(false);
    setOriginalAddress(null);
  }, []);

  // Agregar esta función al hook
  const resetAll = useCallback(() => {
    // Resetear estados de búsqueda
    setSearchQuery('');
    setSuggestions([]);
    setError(null);
    
    // Resetear estados de cliente
    setSelectedCustomer(null);
    setCustomerAddresses([]);
    
    // Resetear estados de dirección
    setIsAddingNewAddress(false);
    setIsEditingAddress(false);
    setOriginalAddress(null);
    
    console.log('[useCustomerSearch] Estado completamente reseteado');
  }, []);

  // Gestión de la búsqueda con debounce para autocompletado
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery && searchQuery.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        searchCustomers(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchCustomers]);

  return {
    // Estados de búsqueda
    searchQuery,
    setSearchQuery,
    suggestions,
    isLoading,
    error,
    
    // Estados de cliente y direcciones
    selectedCustomer,
    setSelectedCustomer,
    customerAddresses,
    setCustomerAddresses,
    isAddingNewAddress,
    setIsAddingNewAddress,
    isEditingAddress,
    setIsEditingAddress,
    originalAddress,
    
    // Funciones principales
    fetchCustomerData,
    handleCustomerSelect,
    clearSuggestions: () => setSuggestions([]),
    
    // Funciones de manejo de direcciones
    handleAddressChange,
    startEditingAddress,
    cancelAddressAction,
    prepareCustomerDataForOrder,
    resetAddressStates,
    resetAll  // Nueva función que resetea todo
  };
};