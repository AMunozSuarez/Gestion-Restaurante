import { useState, useCallback } from 'react';
import api from '../services/api';

export const useCustomers = () => {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar customer por teléfono
  const searchCustomerByPhone = useCallback(async (phone) => {
    if (!phone || phone.trim() === '') {
      setCustomer(null);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/customer/search?query=${encodeURIComponent(phone)}`);
      
      if (response.data.success && response.data.customers && response.data.customers.length > 0) {
        // Buscar cliente que coincida exactamente con el teléfono
        const exactMatch = response.data.customers.find(customer => customer.phone === phone);
        if (exactMatch) {
          setCustomer(exactMatch);
          return exactMatch;
        } else {
          setCustomer(null);
          return null;
        }
      } else {
        setCustomer(null);
        return null;
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      setError(error.response?.data?.message || 'Error al buscar cliente');
      setCustomer(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Crear o actualizar customer
  const saveCustomer = useCallback(async (customerData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/customer/create-or-update', customerData);
      
      if (response.data.success) {
        setCustomer(response.data.customer);
        return { success: true, customer: response.data.customer };
      } else {
        setError(response.data.message || 'Error al guardar cliente');
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar cliente';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Actualizar datos básicos del cliente (nombre, comentario)
  const updateCustomer = useCallback(async (customerId, customerData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/customer/create-or-update', {
        _id: customerId,
        ...customerData
      });
      
      if (response.data.success) {
        setCustomer(response.data.customer);
        return { success: true, customer: response.data.customer };
      } else {
        setError(response.data.message || 'Error al actualizar cliente');
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      const errorMessage = error.response?.data?.message || 'Error al actualizar cliente';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Agregar nueva dirección
  const addAddress = useCallback(async (phone, addressData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar primero el cliente existente por teléfono
      const existingCustomer = await searchCustomerByPhone(phone);
      
      let addresses = [];
      if (existingCustomer && existingCustomer.addresses) {
        addresses = [...existingCustomer.addresses];
      }
      
      // Agregar la nueva dirección
      addresses.push({
        address: addressData.address,
        deliveryCost: addressData.deliveryCost || 0
      });

      const response = await api.post('/customer/create-or-update', {
        _id: existingCustomer?._id,
        name: existingCustomer?.name || '',
        phone,
        addresses,
        comment: existingCustomer?.comment || ''
      });
      
      if (response.data.success) {
        setCustomer(response.data.customer);
        return { success: true, customer: response.data.customer };
      } else {
        setError(response.data.message || 'Error al agregar dirección');
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error('Error adding address:', error);
      const errorMessage = error.response?.data?.message || 'Error al agregar dirección';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [searchCustomerByPhone]);

  // Actualizar dirección existente
  const updateAddress = useCallback(async (phone, addressId, addressData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar primero el cliente existente por teléfono
      const existingCustomer = await searchCustomerByPhone(phone);
      
      if (!existingCustomer) {
        throw new Error('Cliente no encontrado');
      }

      let addresses = [...(existingCustomer.addresses || [])];
      
      // Encontrar y actualizar la dirección por ID
      const addressIndex = addresses.findIndex(addr => addr._id === addressId);
      if (addressIndex >= 0) {
        addresses[addressIndex] = {
          ...addresses[addressIndex],
          address: addressData.address,
          deliveryCost: addressData.deliveryCost || 0
        };
      } else {
        throw new Error('Dirección no encontrada');
      }

      const response = await api.post('/customer/create-or-update', {
        _id: existingCustomer._id,
        name: existingCustomer.name,
        phone,
        addresses,
        comment: existingCustomer.comment || ''
      });
      
      if (response.data.success) {
        setCustomer(response.data.customer);
        return { success: true, customer: response.data.customer };
      } else {
        setError(response.data.message || 'Error al actualizar dirección');
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      console.error('Error updating address:', error);
      const errorMessage = error.response?.data?.message || 'Error al actualizar dirección';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [searchCustomerByPhone]);

  // Buscar clientes por término (teléfono o nombre)
  const searchCustomers = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    try {
      const response = await api.get(`/customer/search?query=${encodeURIComponent(searchTerm)}`);
      
      if (response.data.success && response.data.customers) {
        return response.data.customers;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }, []);

  // Limpiar customer
  const clearCustomer = useCallback(() => {
    setCustomer(null);
    setError(null);
  }, []);

  return {
    customer,
    isLoading,
    error,
    searchCustomerByPhone,
    searchCustomers,
    saveCustomer,
    updateCustomer,
    addAddress,
    updateAddress,
    clearCustomer
  };
};