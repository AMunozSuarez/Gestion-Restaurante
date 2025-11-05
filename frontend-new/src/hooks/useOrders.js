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
      console.log('Obteniendo pedidos con filtros:', filters);
      const response = await ordersService.getOrders(filters);
      
      // El backend devuelve { success: true, orders: [...] }
      if (response.success) {
        console.log('Pedidos obtenidos:', response.orders?.length || 0);
        console.log('Estados y secciones de pedidos:', response.orders?.map(o => ({ id: o._id || o.id, status: o.status, section: o.section })));
        
        // Filtrar adicional en el cliente para asegurar que coincida con los filtros
        let filteredOrders = response.orders || [];
        
        // Filtrar por estado si se especifica
        if (filters.status) {
          filteredOrders = filteredOrders.filter(order => order.status === filters.status);
          console.log('Pedidos después de filtrar por estado:', filteredOrders.length);
        }
        
        // Filtrar por sección si se especifica
        if (filters.section) {
          filteredOrders = filteredOrders.filter(order => order.section === filters.section);
          console.log('Pedidos después de filtrar por sección:', filteredOrders.length);
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
  }, [JSON.stringify(filters)]);

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
          console.log('Removiendo pedido de preparación:', orderId);
          console.log('Pedidos restantes:', filteredOrders.length);
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
      const newOrder = await ordersService.createOrder(orderData);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      return { success: true, order: newOrder };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateOrder = async (orderId, updateData) => {
    try {
      const updatedOrder = await ordersService.updateOrder(orderId, updateData);
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? updatedOrder : order
        )
      );
      return { success: true, order: updatedOrder };
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
    updateOrder
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
      console.log('Obteniendo pedidos recientes con filtros:', filters);
      const response = await ordersService.getRecentOrders(filters);
      
      // El backend devuelve { success: true, orders: [...] }
      if (response.success) {
        console.log('Pedidos recientes obtenidos:', response.orders?.length || 0);
        console.log('Secciones de pedidos recientes:', response.orders?.map(o => ({ id: o._id || o.id, section: o.section, status: o.status })));
        
        // Filtrar adicional en el cliente para asegurar que coincida con los filtros
        let filteredOrders = response.orders || [];
        
        // Filtrar por sección si se especifica
        if (filters.section) {
          filteredOrders = filteredOrders.filter(order => order.section === filters.section);
          console.log('Pedidos recientes después de filtrar por sección:', filteredOrders.length);
        }
        
        // Filtrar por estado si se especifica (puede ser múltiple separado por comas)
        if (filters.status) {
          const statuses = filters.status.split(',').map(s => s.trim());
          filteredOrders = filteredOrders.filter(order => statuses.includes(order.status));
          console.log('Pedidos recientes después de filtrar por estado:', filteredOrders.length);
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
  }, [JSON.stringify(filters)]);

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