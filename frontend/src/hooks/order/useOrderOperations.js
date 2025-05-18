// hooks/order/useOrderOperations.js
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrders } from '../api/useOrders';
import useToast from '../useToast';
import { 
  updateOrderStatusService,
  registerOrderInCashService,
  completeOrderOperation
} from '../../services/api/orderOperationsService';

export const useOrderOperations = () => {
  const queryClient = useQueryClient();
  const { updateOrderInList } = useOrders();
  const toast = useToast();

  /**
   * Actualiza el estado de un pedido
   */
  const handleUpdateOrderStatus = useCallback(async (order) => {
    if (!order || !order._id) {
      toast.error('No se ha seleccionado un pedido para actualizar.');
      return null;
    }

    try {
      const response = await updateOrderStatusService(order);
      
      // Actualizar caché y UI
      queryClient.invalidateQueries(['orders']);
      toast.success('Pedido actualizado correctamente');
      
      if (response && response.order) {
        updateOrderInList(response.order);
      } else {
        updateOrderInList(order);
      }
      
      return response;
    } catch (error) {
      console.error('Error al actualizar el pedido:', error);
      toast.error('Error al actualizar el pedido. Intente nuevamente.');
      return null;
    }
  }, [queryClient, updateOrderInList, toast]);

  /**
   * Registra un pedido en la caja
   */
  const handleRegisterOrderInCash = useCallback(async (orderData) => {
    try {
      const response = await registerOrderInCashService(orderData);
      
      if (response.status === 201) {
        toast.success('Pedido registrado correctamente en la caja.');
        return response;
      } else {
        throw new Error('Error inesperado al registrar el pedido en la caja.');
      }
    } catch (error) {
      console.error('Error al registrar el pedido en la caja:', error);
      toast.error('Error al registrar el pedido en la caja.');
      throw error;
    }
  }, [toast]);

  /**
   * Operación combinada: actualiza pedido y registra en caja
   * Optimizada para el caso común (90%)
   */
  const completeOrder = useCallback(async (order, cartData = null) => {
    try {
      // Validación básica
      if (!order || !order._id) {
        toast.error('No se ha seleccionado un pedido para procesar.');
        return null;
      }
      
      // Preparar datos para la caja si se proporcionan
      let cashData = null;
      if (cartData) {
        cashData = {
          total: cartData.cartTotal + Number(cartData.deliveryCost || 0),
          paymentMethod: cartData.selectedPaymentMethod || order.payment,
          items: cartData.cart.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            comment: item.comment || '',
          })),
          deliveryCost: Number(cartData.deliveryCost || 0),
        };
      }
      
      // Ejecutar operación combinada
      const result = await completeOrderOperation(order, cashData);
      
      // Actualizar UI y caché
      queryClient.invalidateQueries(['orders']);
      
      if (result.orderUpdate && result.orderUpdate.order) {
        updateOrderInList(result.orderUpdate.order);
        toast.success('Pedido procesado correctamente');
      }
      
      if (result.cashRegister) {
        toast.success('Pedido registrado en la caja');
      }
      
      return result;
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      toast.error('Error al procesar el pedido. Intente nuevamente.');
      return null;
    }
  }, [queryClient, updateOrderInList, toast]);

  return {
    handleUpdateOrderStatus,
    handleRegisterOrderInCash,
    completeOrder // Método principal para el caso común
  };
};