import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import cashRegisterService from '../services/cashRegisterService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { useAuth } from '../hooks/useAuth';

const CashRegisterContext = createContext(null);

export const CashRegisterProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cashRegister, setCashRegister] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkCashRegisterStatus = useCallback(async () => {
    if (!isAuthenticated) return;
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
    } catch (err) {
      setError(err.message);
      setCashRegister(null);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch una sola vez al autenticarse (y no en cada cambio de vista)
  useEffect(() => {
    if (isAuthenticated) {
      checkCashRegisterStatus();
    } else {
      setCashRegister(null);
      setIsOpen(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, checkCashRegisterStatus]);

  const openCashRegister = useCallback(async (initialAmount) => {
    try {
      const subscriptionResponse = await getCurrentSubscription();
      if (!subscriptionResponse.success || !subscriptionResponse.data?.subscription) {
        return { success: false, error: 'No tienes una suscripción activa. Por favor suscríbete para poder abrir caja.', requiresSubscription: true };
      }
      const subscription = subscriptionResponse.data.subscription;
      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        return { success: false, error: 'Tu suscripción ha expirado. Por favor renueva tu plan para continuar.', requiresSubscription: true };
      }
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      if (endDate < now) {
        return { success: false, error: 'Tu suscripción ha expirado. Por favor renueva tu plan para continuar.', requiresSubscription: true };
      }
      const response = await cashRegisterService.openCashRegister({ initialBalance: parseFloat(initialAmount) || 0 });
      if (response.success) {
        await checkCashRegisterStatus();
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (err) {
      if (err.message?.includes('suscripción') || err.message?.includes('subscription') || err.response?.data?.requiresSubscription) {
        return { success: false, error: err.response?.data?.message || err.message || 'No tienes una suscripción activa', requiresSubscription: true };
      }
      return { success: false, error: err.message };
    }
  }, [checkCashRegisterStatus]);

  const closeCashRegister = useCallback(async ({ officialIncome, comment }) => {
    try {
      const response = await cashRegisterService.closeCashRegister({ officialIncome, comment });
      if (response.success) {
        await checkCashRegisterStatus();
        return { success: true };
      }
      return { success: false, error: response.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [checkCashRegisterStatus]);

  const getCashRegisterSales = useCallback(async (cashRegisterId = null, filters = {}) => {
    try {
      setError(null);
      let response;
      if (cashRegisterId) {
        response = await cashRegisterService.getCashRegisterSales(cashRegisterId, filters);
      } else {
        response = await cashRegisterService.getCurrentCashRegisterSales(filters);
      }
      if (response.success) {
        return { success: true, cashRegister: response.cashRegister, orders: response.orders, statistics: response.statistics };
      }
      return { success: false, error: response.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const refreshCashRegisterStatus = useCallback(async () => {
    await checkCashRegisterStatus();
  }, [checkCashRegisterStatus]);

  const value = {
    cashRegister,
    isOpen,
    isLoading,
    error,
    checkCashRegisterStatus,
    openCashRegister,
    closeCashRegister,
    getCashRegisterSales,
    refreshCashRegisterStatus,
  };

  return (
    <CashRegisterContext.Provider value={value}>
      {children}
    </CashRegisterContext.Provider>
  );
};

// Hook que reemplaza al antiguo useCashRegister — misma API, pero usa el contexto compartido
export const useCashRegister = () => {
  const context = useContext(CashRegisterContext);
  if (!context) {
    throw new Error('useCashRegister debe usarse dentro de un CashRegisterProvider');
  }
  return context;
};
