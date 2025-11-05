import { useState, useEffect } from 'react';
import cashRegisterService from '../services/cashRegisterService';

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

  const addOrderToCashRegister = async (orderData) => {
    try {
      const response = await cashRegisterService.addOrderToCashRegister(orderData);
      
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

  return {
    cashRegister,
    isOpen,
    isLoading,
    error,
    checkCashRegisterStatus,
    openCashRegister,
    closeCashRegister,
    addOrderToCashRegister
  };
};