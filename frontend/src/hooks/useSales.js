import { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';

// Hook para obtener TODAS las ventas del restaurante (sin filtro de caja)
export const useSales = (filters = {}) => {
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0, limit: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersService.getAllSales(filters);

      if (response.success) {
        setSales(response.orders || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setSales([]);
        setError(response.message || 'No se pudieron obtener las ventas');
      }
    } catch (error) {
      setError(error.message);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [JSON.stringify(filters)]);

  const updateSaleStatus = async (saleId, status) => {
    try {
      await ordersService.updateOrderStatus(saleId, status);

      setSales(prevSales =>
        prevSales.map(sale =>
          (sale._id || sale.id) === saleId
            ? { ...sale, status, updatedAt: new Date().toISOString() }
            : sale
        )
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    sales,
    pagination,
    isLoading,
    error,
    refetch: fetchSales,
    updateSaleStatus
  };
};
