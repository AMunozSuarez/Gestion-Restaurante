import { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';

// Hook para obtener TODAS las ventas del restaurante (sin filtro de caja)
export const useSales = (filters = {}) => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Obteniendo todas las ventas con filtros:', filters);
      const response = await ordersService.getAllSales(filters);
      
      // El backend devuelve { success: true, orders: [...] }
      if (response.success) {
        console.log('Ventas obtenidas:', response.orders?.length || 0);
        console.log('Estados y secciones de ventas:', response.orders?.map(o => ({ id: o._id || o.id, status: o.status, section: o.section })));
        
        // Filtrar adicional en el cliente para asegurar que coincida con los filtros
        let filteredSales = response.orders || [];
        
        // Filtrar por estado si se especifica
        if (filters.status) {
          filteredSales = filteredSales.filter(sale => sale.status === filters.status);
          console.log('Ventas después de filtrar por estado:', filteredSales.length);
        }
        
        // Filtrar por sección si se especifica
        if (filters.section) {
          filteredSales = filteredSales.filter(sale => sale.section === filters.section);
          console.log('Ventas después de filtrar por sección:', filteredSales.length);
        }
        
        setSales(filteredSales);
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
      const response = await ordersService.updateOrderStatus(saleId, status);
      
      // Actualizar el pedido en el estado local
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
    isLoading,
    error,
    refetch: fetchSales,
    updateSaleStatus
  };
};