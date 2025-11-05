import { useState, useEffect } from 'react';
import cashRegisterService from '../services/cashRegisterService';

export const useCashRegisters = () => {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCashRegisters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cashRegisterService.getAllCashRegisters();
      
      if (response.success) {
        setCashRegisters(response.cashRegisters || []);
      } else {
        setError(response.message || 'Error al obtener cajas');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashRegisters();
  }, []);

  const refetch = () => {
    fetchCashRegisters();
  };

  return {
    cashRegisters,
    isLoading,
    error,
    refetch
  };
};

export const useCashRegisterDetail = (id) => {
  const [cashRegister, setCashRegister] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCashRegisterDetail = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await cashRegisterService.getCashRegisterById(id);
      
      if (response.success) {
        setCashRegister(response.cashRegister);
      } else {
        setError(response.message || 'Error al obtener detalle de la caja');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashRegisterDetail();
  }, [id]);

  const refetch = () => {
    fetchCashRegisterDetail();
  };

  return {
    cashRegister,
    isLoading,
    error,
    refetch
  };
};