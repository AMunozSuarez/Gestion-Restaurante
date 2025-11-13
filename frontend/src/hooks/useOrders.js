import { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';

// Hook para obtener pedidos
export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersService.getOrders(filters);
      
      // El backend devuelve { success: true, orders: [...] }
      if (response.success) {
        
        // Filtrar adicional en el cliente para asegurar que coincida con los filtros
        let filteredOrders = response.orders || [];
        
        // Filtrar por estado si se especifica
        if (filters.status) {
          filteredOrders = filteredOrders.filter(order => order.status === filters.status);
        }
        
        // Filtrar por sección si se especifica
        if (filters.section) {
          filteredOrders = filteredOrders.filter(order => order.section === filters.section);
        }
        
        setOrders(filteredOrders);
      } else {
        setOrders([]);
        setError(response.message || 'No se pudieron obtener los pedidos');
      }
    } catch (error) {
      setError(error.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.section, filters.limit, filters.sortBy]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await ordersService.updateOrderStatus(orderId, status);
      
      // Si el filtro actual es para pedidos en preparación y el nuevo estado no es preparación,
      // remover el pedido de la lista local inmediatamente
      if (filters.status === 'Preparacion' && (status === 'Completado' || status === 'Cancelado')) {
        setOrders(prevOrders => {
          const filteredOrders = prevOrders.filter(order => 
            (order._id || order.id) !== orderId
          );
          return filteredOrders;
        });
      } else {
        // Actualizar el pedido en el estado local
        setOrders(prevOrders => 
          prevOrders.map(order => 
            (order._id || order.id) === orderId 
              ? { ...order, status, updatedAt: new Date().toISOString() }
              : order
          )
        );
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createOrder = async (orderData) => {
    try {
      const response = await ordersService.createOrder(orderData);
      
      // El servicio retorna { success: true, order: {...} }
      if (response.success && response.order) {
        // Solo agregar el pedido si coincide con los filtros actuales
        const newOrder = response.order;
        let shouldAdd = true;
        
        // Verificar filtros
        if (filters.status && newOrder.status !== filters.status) {
          shouldAdd = false;
        }
        if (filters.section && newOrder.section !== filters.section) {
          shouldAdd = false;
        }
        
        if (shouldAdd) {
          setOrders(prevOrders => [newOrder, ...prevOrders]);
        }
        
        return { success: true, order: newOrder };
      } else {
        return { success: false, error: response.message || 'Error desconocido' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateOrder = async (orderId, updateData) => {
    try {
      const response = await ordersService.updateOrder(orderId, updateData);
      
      // El servicio retorna { success: true, order: {...} }
      if (response.success && response.order) {
        const updatedOrder = response.order;
        
        // Si el pedido cambió de estado y ya no coincide con los filtros actuales, removerlo
        const shouldRemove = (filters.status && updatedOrder.status !== filters.status) ||
                            (filters.section && updatedOrder.section !== filters.section);
        
        if (shouldRemove) {
          setOrders(prevOrders => 
            prevOrders.filter(order => 
              (order._id || order.id) !== orderId
            )
          );
        } else {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              (order._id || order.id) === orderId ? updatedOrder : order
            )
          );
        }
        
        return { success: true, order: updatedOrder };
      } else {
        return { success: false, error: response.message || 'Error desconocido' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateOrderWithoutPrint = async (orderId, updateData) => {
    try {
      const response = await ordersService.updateOrderWithoutPrint(orderId, updateData);
      
      // El servicio retorna { success: true, order: {...} }
      if (response.success && response.order) {
        const updatedOrder = response.order;
        
        // Si el pedido cambió de estado y ya no coincide con los filtros actuales, removerlo
        const shouldRemove = (filters.status && updatedOrder.status !== filters.status) ||
                            (filters.section && updatedOrder.section !== filters.section);
        
        if (shouldRemove) {
          setOrders(prevOrders => 
            prevOrders.filter(order => 
              (order._id || order.id) !== orderId
            )
          );
        } else {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              (order._id || order.id) === orderId ? updatedOrder : order
            )
          );
        }
        
        return { success: true, order: updatedOrder };
      } else {
        return { success: false, error: response.message || 'Error desconocido' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    createOrder,
    updateOrder,
    updateOrderWithoutPrint
  };
};

// Hook para obtener pedidos recientes
export const useRecentOrders = (filters = {}) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersService.getRecentOrders(filters);
      
      // El backend devuelve { success: true, orders: [...] }
      if (response.success) {
        
        // Filtrar adicional en el cliente para asegurar que coincida con los filtros
        let filteredOrders = response.orders || [];
        
        // Filtrar por sección si se especifica
        if (filters.section) {
          filteredOrders = filteredOrders.filter(order => order.section === filters.section);
        }
        
        // Filtrar por estado si se especifica (puede ser múltiple separado por comas)
        if (filters.status) {
          const statuses = filters.status.split(',').map(s => s.trim());
          filteredOrders = filteredOrders.filter(order => statuses.includes(order.status));
        }
        
        setOrders(filteredOrders);
      } else {
        setOrders([]);
        setError(response.message || 'No se pudieron obtener los pedidos recientes');
      }
    } catch (error) {
      setError(error.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
  }, [filters.limit, filters.status, filters.section, filters.sortBy]);

  return { 
    orders, 
    isLoading, 
    error, 
    refetch: fetchRecentOrders 
  };
};

// Hook para un pedido específico
export const useOrder = (orderId) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await ordersService.getOrderById(orderId);
        setOrder(response);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return { order, isLoading, error };
};