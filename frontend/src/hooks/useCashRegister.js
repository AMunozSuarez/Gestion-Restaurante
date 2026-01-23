import { useState, useEffect } from 'react';
import cashRegisterService from '../services/cashRegisterService';
import { getCurrentSubscription } from '../services/subscriptionService';

export const useCashRegister = () => {
  const [cashRegister, setCashRegister] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkCashRegisterStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cashRegisterService.getCashRegisterStatus();
      
      if (response.success) {
        setCashRegister(response.cashRegister);
        setIsOpen(response.cashRegister?.status === 'Abierta');
      } else {
        setCashRegister(null);
        setIsOpen(false);
      }
    } catch (error) {
      setError(error.message);
      setCashRegister(null);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCashRegisterStatus();
  }, []);

  const openCashRegister = async (initialAmount) => {
    try {
      // Primero verificar si hay una suscripción activa
      const subscriptionResponse = await getCurrentSubscription();
      
      // Si no hay suscripción o no es exitosa
      if (!subscriptionResponse.success || !subscriptionResponse.data?.subscription) {
        return { 
          success: false, 
          error: 'No tienes una suscripción activa. Por favor suscríbete para poder abrir caja.',
          requiresSubscription: true 
        };
      }
      
      const subscription = subscriptionResponse.data.subscription;
      
      // Verificar que la suscripción esté activa o en trial
      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        return { 
          success: false, 
          error: 'Tu suscripción ha expirado. Por favor renueva tu plan para continuar.',
          requiresSubscription: true 
        };
      }
      
      // Verificar que no esté vencida
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      if (endDate < now) {
        return { 
          success: false, 
          error: 'Tu suscripción ha expirado. Por favor renueva tu plan para continuar.',
          requiresSubscription: true 
        };
      }
      
      // Si la suscripción está activa, proceder a abrir la caja
      const response = await cashRegisterService.openCashRegister({
        initialBalance: parseFloat(initialAmount) || 0
      });
      
      if (response.success) {
        await checkCashRegisterStatus(); // Refrescar estado
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      // Manejar errores específicos de suscripción
      if (error.message?.includes('suscripción') || 
          error.message?.includes('subscription') ||
          error.response?.data?.requiresSubscription) {
        return { 
          success: false, 
          error: error.response?.data?.message || error.message || 'No tienes una suscripción activa',
          requiresSubscription: true 
        };
      }
      return { success: false, error: error.message };
    }
  };

  const closeCashRegister = async ({ officialIncome, comment }) => {
    try {
      const response = await cashRegisterService.closeCashRegister({
        officialIncome,
        comment
      });
      
      if (response.success) {
        await checkCashRegisterStatus(); // Refrescar estado
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getCashRegisterSales = async (cashRegisterId = null, filters = {}) => {
    try {
      setError(null);
      let response;
      
      if (cashRegisterId) {
        response = await cashRegisterService.getCashRegisterSales(cashRegisterId, filters);
      } else {
        response = await cashRegisterService.getCurrentCashRegisterSales(filters);
      }
      
      if (response.success) {
        return {
          success: true,
          cashRegister: response.cashRegister,
          orders: response.orders,
          statistics: response.statistics
        };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Función para refrescar los datos después de completar una orden
  const refreshCashRegisterStatus = async () => {
    await checkCashRegisterStatus();
  };

  return {
    cashRegister,
    isOpen,
    isLoading,
    error,
    checkCashRegisterStatus,
    openCashRegister,
    closeCashRegister,
    getCashRegisterSales,
    refreshCashRegisterStatus
  };
};