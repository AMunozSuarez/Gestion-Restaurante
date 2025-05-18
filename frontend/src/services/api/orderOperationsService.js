// services/api/orderOperationsService.js
import axios from '../../services/axiosConfig';
import { updateOrder } from './ordersApi';
import { closeOrder } from './cashApi';

/**
 * Enriquece un objeto de pedido con datos completos del cliente
 */
export const enrichOrderWithCustomerData = (order) => {
  if (!order || !order.buyer || !order.buyer.phone) return order;
  
  try {
    const cachedCustomer = localStorage.getItem(`customer_${order.buyer.phone}`);
    if (!cachedCustomer) return order;
    
    const customerData = JSON.parse(cachedCustomer);
    
    // Si buyer es un objeto, enriquecerlo
    if (typeof order.buyer === 'object') {
      order.buyer = {
        ...order.buyer,
        _id: customerData._id || order.buyer._id,
        email: customerData.email || order.buyer.email,
        addresses: order.buyer.addresses || customerData.addresses
      };
    } 
    // Si buyer es un string (ID), convertirlo a objeto
    else if (typeof order.buyer === 'string') {
      const buyerId = order.buyer;
      order.buyer = {
        _id: buyerId,
        ...customerData
      };
    }
    
    return order;
  } catch (error) {
    console.error('Error al enriquecer pedido con datos de cliente:', error);
    return order;
  }
};

/**
 * Normaliza la respuesta del servidor para mantener los datos del cliente
 */
export const normalizeOrderResponse = (responseOrder, originalOrder) => {
  if (!responseOrder) return originalOrder;
  
  try {
    // Obtener datos de cliente si es posible
    let customerData = null;
    if (originalOrder.buyer && originalOrder.buyer.phone) {
      const cachedCustomer = localStorage.getItem(`customer_${originalOrder.buyer.phone}`);
      if (cachedCustomer) customerData = JSON.parse(cachedCustomer);
    }
    
    if (!customerData) return responseOrder;
    
    // Normalizar los datos del cliente
    if (responseOrder.buyer && typeof responseOrder.buyer === 'object') {
      responseOrder.buyer = {
        ...responseOrder.buyer,
        _id: responseOrder.buyer._id || customerData._id,
        email: responseOrder.buyer.email || customerData.email
      };
    } else if (typeof responseOrder.buyer === 'string') {
      const buyerId = responseOrder.buyer;
      responseOrder.buyer = {
        _id: buyerId,
        ...customerData
      };
    }
    
    return responseOrder;
  } catch (error) {
    console.error('Error al normalizar respuesta de pedido:', error);
    return responseOrder;
  }
};

/**
 * Actualiza el estado de un pedido en el servidor
 */
export const updateOrderStatusService = async (order) => {
  if (!order || !order._id) {
    throw new Error('No se ha proporcionado un pedido válido para actualizar');
  }
  
  // Enriquecer pedido con datos de cliente
  const enrichedOrder = enrichOrderWithCustomerData(order);
  console.log('Actualizando pedido con datos enriquecidos:', enrichedOrder);
  
  const response = await updateOrder(enrichedOrder._id, enrichedOrder);
  
  // Normalizar la respuesta
  if (response && response.order) {
    const normalizedOrder = normalizeOrderResponse(response.order, enrichedOrder);
    return { ...response, order: normalizedOrder };
  }
  
  return response;
};

/**
 * Registra el pedido en la caja
 */
export const registerOrderInCashService = async (orderData) => {
  if (!orderData.paymentMethod) {
    throw new Error('Por favor, selecciona un método de pago.');
  }

  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('El carrito está vacío. Agrega productos antes de cerrar el pedido.');
  }

  // Formato para API de caja
  const cashOrderData = {
    total: orderData.total,
    paymentMethod: orderData.paymentMethod,
    items: orderData.items.map(item => ({
      productId: item.productId || item._id,
      quantity: item.quantity,
      comment: item.comment || '',
    })),
    deliveryCost: Number(orderData.deliveryCost) || 0,
  };

  console.log('Registrando pedido en la caja:', cashOrderData);
  return await closeOrder(cashOrderData);
};

/**
 * Función integrada que actualiza el estado y registra en caja si es necesario
 */
export const completeOrderOperation = async (order, cashData = null) => {
  // Paso 1: Actualizar el estado del pedido
  const updateResponse = await updateOrderStatusService(order);
  
  // Paso 2: Registrar en caja si se proporcionan datos
  let cashResponse = null;
  if (cashData) {
    cashResponse = await registerOrderInCashService(cashData);
  }
  
  return {
    orderUpdate: updateResponse,
    cashRegister: cashResponse
  };
};