import { useState, useEffect } from 'react';
import cashRegisterService from '../services/cashRegisterService';

export const useCashRegisterSales = (cashRegisterId = null, filters = {}) => {
  const [sales, setSales] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSales = async () => {
    // Solo buscar si hay un cashRegisterId específico o si activeOnly está activado
    if (!cashRegisterId && !filters.activeOnly) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      let response;
      if (cashRegisterId) {
        response = await cashRegisterService.getCashRegisterSales(cashRegisterId, filters);
      } else if (filters.activeOnly) {
        response = await cashRegisterService.getCurrentCashRegisterSales(filters);
      }
      
      if (response && response.success) {
        setSales(response.orders || []);
        setCashRegister(response.cashRegister);
        setStatistics(response.statistics);
      } else {
        setSales([]);
        setCashRegister(null);
        setStatistics(null);
        if (response && response.message) {
          setError(response.message);
        }
      }
    } catch (error) {
      setError(error.message);
      setSales([]);
      setCashRegister(null);
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clear stale data immediately when cashRegisterId changes so the UI
    // doesn't show the previous cash register's data while the new fetch runs.
    setSales([]);
    setStatistics(null);
    setCashRegister(null);
    fetchSales();
  }, [cashRegisterId, JSON.stringify(filters)]);

  const refetch = () => {
    fetchSales();
  };

  return {
    sales,
    cashRegister,
    statistics,
    isLoading,
    error,
    refetch
  };
};

export default useCashRegisterSales;