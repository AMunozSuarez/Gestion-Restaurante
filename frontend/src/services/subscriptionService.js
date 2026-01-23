import api from './api';

/**
 * Servicio para gestionar suscripciones
 */

// Obtener todos los planes disponibles
export const getPlans = async () => {
  try {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  } catch (error) {
    console.error('Error al obtener planes:', error);
    throw error;
  }
};

// Obtener la suscripción actual del restaurante
export const getCurrentSubscription = async () => {
  try {
    const response = await api.get('/subscriptions/current');
    return response.data;
  } catch (error) {
    // Si es 404, significa que no hay suscripción, no es un error crítico
    if (error.response?.status === 404) {
      console.log('No se encontró suscripción activa');
      return {
        success: false,
        message: 'No se encontró suscripción activa',
        data: null
      };
    }
    console.error('Error al obtener suscripción actual:', error);
    throw error;
  }
};

// Iniciar proceso de checkout
export const initiateCheckout = async (restaurantId, plan) => {
  try {
    const response = await api.post('/subscriptions/checkout', {
      restaurantId,
      plan,
    });
    return response.data;
  } catch (error) {
    console.error('Error al iniciar checkout:', error);
    throw error;
  }
};

// Verificar pago de MercadoPago
export const verifyPayment = async (paymentId, externalReference) => {
  try {
    const response = await api.get('/subscriptions/verify-payment', {
      params: {
        payment_id: paymentId,
        external_reference: externalReference,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al verificar pago:', error);
    throw error;
  }
};

// Crear nueva suscripción
export const createSubscription = async (data) => {
  try {
    const response = await api.post('/subscriptions/create', data);
    return response.data;
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    throw error;
  }
};

// Renovar suscripción
export const renewSubscription = async (subscriptionId, paymentData) => {
  try {
    const response = await api.put(`/subscriptions/${subscriptionId}/renew`, {
      paymentData,
    });
    return response.data;
  } catch (error) {
    console.error('Error al renovar suscripción:', error);
    throw error;
  }
};

// Cambiar de plan
export const upgradePlan = async (subscriptionId, newPlan) => {
  try {
    const response = await api.put(`/subscriptions/${subscriptionId}/upgrade`, {
      newPlan,
    });
    return response.data;
  } catch (error) {
    console.error('Error al cambiar plan:', error);
    throw error;
  }
};

// Cancelar suscripción
export const cancelSubscription = async (subscriptionId, reason) => {
  try {
    const response = await api.put(`/subscriptions/${subscriptionId}/cancel`, {
      reason,
    });
    return response.data;
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    throw error;
  }
};

// Obtener historial de pagos
export const getPaymentHistory = async (subscriptionId) => {
  try {
    const response = await api.get(`/subscriptions/${subscriptionId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    throw error;
  }
};

// === Funciones de administración ===

// Obtener todas las suscripciones (Admin)
export const getAllSubscriptions = async (params = {}) => {
  try {
    const response = await api.get('/subscriptions/admin/all', { params });
    return response.data;
  } catch (error) {
    console.error('Error al obtener todas las suscripciones:', error);
    throw error;
  }
};

// Obtener estadísticas (Admin)
export const getSubscriptionStats = async () => {
  try {
    const response = await api.get('/subscriptions/admin/stats');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

// Confirmar pago manual (Admin)
export const confirmManualPayment = async (subscriptionId, paymentData) => {
  try {
    const response = await api.post(
      `/subscriptions/admin/${subscriptionId}/confirm-payment`,
      paymentData
    );
    return response.data;
  } catch (error) {
    console.error('Error al confirmar pago manual:', error);
    throw error;
  }
};
