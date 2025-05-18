// hooks/api/useCustomerManagement.js
import { useState } from 'react';
import axios from '../services/axiosConfig';

export const useCustomerManagement = () => {
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  // Buscar cliente por teléfono
  const findCustomerByPhone = async (phone) => {
    if (!phone) return null;
    
    setCustomerLoading(true);
    setCustomerError(null);
    
    try {
      const response = await axios.get(`/customer/search?query=${phone}`);
      
      if (response.data?.success && response.data?.customers?.length > 0) {
        const exactCustomer = response.data.customers.find(c => c.phone === phone);
        return exactCustomer || null;
      }
      return null;
    } catch (error) {
      setCustomerError(error);
      console.error('Error al buscar cliente:', error);
      return null;
    } finally {
      setCustomerLoading(false);
    }
  };

  // Crear o actualizar cliente
  const createOrUpdateCustomer = async (customerData) => {
    if (!customerData || !customerData.phone) return null;
    
    setCustomerLoading(true);
    setCustomerError(null);
    
    try {
      // Procesar direcciones para eliminar duplicados
      if (customerData.addresses && Array.isArray(customerData.addresses)) {
        // Filtrar direcciones temporales
        customerData.addresses = customerData.addresses.filter(addr => !addr._isTemporary);
        
        // Eliminar duplicados usando un Map
        const addressMap = new Map();
        customerData.addresses.forEach(addr => {
          const key = addr.address;
          if (!addressMap.has(key) || (!addressMap.get(key)._id && addr._id)) {
            addressMap.set(key, addr);
          }
        });
        
        customerData.addresses = Array.from(addressMap.values());
      }
      
      const response = await axios.post('/customer/create-or-update', customerData);
      
      if (response.data?.success && response.data?.customer) {
        return response.data.customer;
      }
      return null;
    } catch (error) {
      setCustomerError(error);
      console.error('Error al crear/actualizar cliente:', error);
      return null;
    } finally {
      setCustomerLoading(false);
    }
  };

  // Gestionar direcciones de cliente
  const manageCustomerAddresses = async (customerPhone, addressData, options = {}) => {
    const { isEditingAddress, originalAddress, isAddingNewAddress } = options;
    
    if (!customerPhone || !addressData.address) {
      return [addressData]; // Si no hay suficiente información, solo devolver la dirección actual
    }
    
    try {
        console.log('ejecutando manageCustomerAddresses con:')
      // Buscar cliente existente
      const existingCustomer = await findCustomerByPhone(customerPhone);
      
      if (!existingCustomer || !existingCustomer.addresses || !existingCustomer.addresses.length) {
        return [addressData]; // Cliente no encontrado o sin direcciones
      }
      
      let updatedAddresses = [...existingCustomer.addresses];
      
      // Caso 1: Edición de dirección existente
      if (isEditingAddress && originalAddress) {
        let existingIndex = -1;
        
        // Buscar por ID
        if (originalAddress._id) {
          existingIndex = updatedAddresses.findIndex(
            addr => addr._id && addr._id.toString() === originalAddress._id.toString()
          );
        }
        
        // Si no se encuentra por ID, buscar por texto
        if (existingIndex < 0 && originalAddress.address) {
          existingIndex = updatedAddresses.findIndex(
            addr => addr.address === originalAddress.address
          );
        }
        
        if (existingIndex >= 0) {
          // Actualizar dirección existente manteniendo su ID
          updatedAddresses = updatedAddresses.map((addr, idx) => {
            if (idx === existingIndex) {
              return {
                _id: addr._id,
                address: addressData.address,
                deliveryCost: addressData.deliveryCost || 0
              };
            }
            return addr;
          });
        } else {
          // No se encontró la dirección original, agregar como nueva
          updatedAddresses.push(addressData);
        }
      }
      // Caso 2: Añadir nueva dirección
      else if (isAddingNewAddress) {
        updatedAddresses.push(addressData);
      }
      // Caso 3: Selección normal, verificar si ya existe
      else {
        const existingIndex = updatedAddresses.findIndex(
          addr => addr.address === addressData.address
        );
        
        if (existingIndex >= 0) {
          // La dirección ya existe, actualizar solo el costo si ha cambiado
          const originalCost = updatedAddresses[existingIndex].deliveryCost || 0;
          const newCost = addressData.deliveryCost || 0;
          
          if (originalCost !== newCost) {
            updatedAddresses = updatedAddresses.map((addr, idx) => {
              if (idx === existingIndex) {
                return {
                  ...addr,
                  deliveryCost: newCost
                };
              }
              return addr;
            });
          }
        } else {
          // La dirección no existe, agregar como nueva
          updatedAddresses.push(addressData);
        }
      }
      
      return updatedAddresses;
    } catch (error) {
      console.error('Error al gestionar direcciones del cliente:', error);
      return [addressData]; // En caso de error, devolver solo la dirección actual
    }
  };

  return {
    findCustomerByPhone,
    createOrUpdateCustomer,
    manageCustomerAddresses,
    customerLoading,
    customerError
  };
};