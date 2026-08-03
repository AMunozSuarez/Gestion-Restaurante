import { useState, useEffect } from 'react';
import ordersService from '../services/ordersService';
import { onSocketEvent } from '../services/socketService';

// Hook para obtener pedidos
export const useOrders = (filters = {}, callbacks = {}) => {
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
        // El backend ya filtra por status/section via query params
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
        // Ejecutar callback de éxito después de remover el pedido
        if (callbacks.onOrderRemoved) {
          callbacks.onOrderRemoved({ id: orderId, status });
        }
      } else {
        const updatedOrder = { id: orderId, status, updatedAt: new Date().toISOString() };
        // Actualizar el pedido en el estado local
        setOrders(prevOrders => 
          prevOrders.map(order => 
            (order._id || order.id) === orderId 
              ? { ...order, ...updatedOrder }
              : order
          )
        );
        // Ejecutar callback de éxito después de actualizar el pedido
        if (callbacks.onOrderUpdated) {
          callbacks.onOrderUpdated(updatedOrder);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  };

  const createOrder = async (orderData, options = {}) => {
    try {
      const response = await ordersService.createOrder(orderData, options);
      
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
      return { success: false, error: error.response?.data?.message || error.message };
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
      return { success: false, error: error.response?.data?.message || error.message };
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
          // Ejecutar callback de éxito después de remover el pedido
          if (callbacks.onOrderRemoved) {
            callbacks.onOrderRemoved(updatedOrder);
          }
        } else {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              (order._id || order.id) === orderId ? updatedOrder : order
            )
          );
          // Ejecutar callback de éxito después de actualizar el pedido
          if (callbacks.onOrderUpdated) {
            callbacks.onOrderUpdated(updatedOrder);
          }
        }
        
        return { success: true, order: updatedOrder };
      } else {
        return { success: false, error: response.message || 'Error desconocido' };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
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
        // El backend ya filtra por section/status via query params
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

// Hook combinado: obtiene pedidos activos + recientes en UNA sola llamada
export const useSectionOrders = (section, recentConfig = {}, callbacks = {}) => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { recentLimit = 10, recentStatuses = 'Completado,Cancelado' } = recentConfig;

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersService.getSectionOrders({
        section,
        recentLimit,
        recentStatuses,
      });
      if (response.success) {
        setActiveOrders(response.active || []);
        setRecentOrders(response.recent || []);
      } else {
        setActiveOrders([]);
        setRecentOrders([]);
        setError(response.message || 'No se pudieron obtener los pedidos');
      }
    } catch (err) {
      setError(err.message);
      setActiveOrders([]);
      setRecentOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [section, recentLimit, recentStatuses]);

  // Listen for real-time order events via Socket.io
  useEffect(() => {
    const unsubCreated = onSocketEvent('order:created', ({ order }) => {
      if (!order) return;
      if (section && order.section !== section) return;
      if (order.status === 'Preparacion') {
        setActiveOrders(prev => {
          if (prev.some(o => (o._id || o.id) === (order._id || order.id))) return prev;
          return [order, ...prev];
        });
      }
    });

    const unsubUpdated = onSocketEvent('order:updated', ({ order }) => {
      if (!order) return;
      if (section && order.section !== section) return;
      const orderId = order._id || order.id;
      if (order.status === 'Preparacion') {
        setActiveOrders(prev => prev.map(o => (o._id || o.id) === orderId ? order : o));
      } else {
        setActiveOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
        const recentStatusList = recentStatuses.split(',').map(s => s.trim());
        if (recentStatusList.includes(order.status)) {
          setRecentOrders(prev => [order, ...prev.filter(o => (o._id || o.id) !== orderId)].slice(0, recentLimit));
        }
      }
    });

    return () => { unsubCreated(); unsubUpdated(); };
  }, [section, recentStatuses, recentLimit]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await ordersService.updateOrderStatus(orderId, status);
      const recentStatusList = recentStatuses.split(',').map(s => s.trim());
      if (recentStatusList.includes(status)) {
        const movedOrder = activeOrders.find(o => (o._id || o.id) === orderId);
        setActiveOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
        if (movedOrder) {
          const updatedOrder = { ...movedOrder, status, updatedAt: new Date().toISOString() };
          setRecentOrders(prev => [updatedOrder, ...prev.filter(o => (o._id || o.id) !== orderId)].slice(0, recentLimit));
        }
        if (callbacks.onOrderRemoved) callbacks.onOrderRemoved({ id: orderId, status });
      } else {
        setActiveOrders(prev =>
          prev.map(o => (o._id || o.id) === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o)
        );
        if (callbacks.onOrderUpdated) callbacks.onOrderUpdated({ id: orderId, status });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const createOrder = async (orderData, options = {}) => {
    try {
      const response = await ordersService.createOrder(orderData, options);
      if (response.success && response.order) {
        const newOrder = response.order;
        if ((!section || newOrder.section === section) && newOrder.status === 'Preparacion') {
          setActiveOrders(prev => {
            if (prev.some(o => (o._id || o.id) === (newOrder._id || newOrder.id))) return prev;
            return [newOrder, ...prev];
          });
        }
        return { success: true, order: newOrder };
      }
      return { success: false, error: response.message || 'Error desconocido' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const updateOrder = async (orderId, updateData) => {
    try {
      const response = await ordersService.updateOrder(orderId, updateData);
      if (response.success && response.order) {
        const updated = response.order;
        const shouldRemove = updated.status !== 'Preparacion' || (section && updated.section !== section);
        if (shouldRemove) {
          setActiveOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
          const recentStatusList = recentStatuses.split(',').map(s => s.trim());
          if (recentStatusList.includes(updated.status)) {
            setRecentOrders(prev => [updated, ...prev.filter(o => (o._id || o.id) !== orderId)].slice(0, recentLimit));
          }
        } else {
          setActiveOrders(prev => prev.map(o => (o._id || o.id) === orderId ? updated : o));
        }
        return { success: true, order: updated };
      }
      return { success: false, error: response.message || 'Error desconocido' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  const updateOrderWithoutPrint = async (orderId, updateData) => {
    try {
      const response = await ordersService.updateOrderWithoutPrint(orderId, updateData);
      if (response.success && response.order) {
        const updated = response.order;
        const shouldRemove = updated.status !== 'Preparacion' || (section && updated.section !== section);
        if (shouldRemove) {
          setActiveOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
          const recentStatusList = recentStatuses.split(',').map(s => s.trim());
          if (recentStatusList.includes(updated.status)) {
            setRecentOrders(prev => [updated, ...prev.filter(o => (o._id || o.id) !== orderId)].slice(0, recentLimit));
          }
          if (callbacks.onOrderRemoved) callbacks.onOrderRemoved(updated);
        } else {
          setActiveOrders(prev => prev.map(o => (o._id || o.id) === orderId ? updated : o));
          if (callbacks.onOrderUpdated) callbacks.onOrderUpdated(updated);
        }
        return { success: true, order: updated };
      }
      return { success: false, error: response.message || 'Error desconocido' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  return {
    orders: activeOrders,
    completedOrders: recentOrders,
    isLoading,
    error,
    refetch: fetchAll,
    updateOrderStatus,
    createOrder,
    updateOrder,
    updateOrderWithoutPrint,
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