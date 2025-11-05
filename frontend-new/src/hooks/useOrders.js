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
        setOrders(response.orders || []);
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
      await ordersService.updateOrderStatus(orderId, status);
      // Actualizar el pedido en el estado local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );
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

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await ordersService.getRecentOrders(filters);
        
        // El backend devuelve { success: true, orders: [...] }
        if (response.success) {
          setOrders(response.orders || []);
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

    fetchRecentOrders();
  }, [JSON.stringify(filters)]);

  return { orders, isLoading, error };
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