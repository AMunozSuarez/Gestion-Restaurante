import api from './api';

/**
 * Servicio del kiosco de autoservicio.
 *
 * Usa la misma instancia de axios que el resto del sistema (Bearer + refresh de token),
 * pero deliberadamente NO reutiliza ordersService.createOrder: ese método dispara la
 * impresión de comanda como efecto secundario (el kiosco no tiene impresora, imprime el PC
 * de caja al recibir el socket) y colapsa los errores en un Error genérico, perdiendo el
 * `code` y los `unavailableItems` que el kiosco necesita para reaccionar.
 */

const extractError = (error) => {
  const data = error.response?.data || {};
  return {
    ok: false,
    code: data.code || (error.response ? 'UNKNOWN' : 'NETWORK'),
    message: data.message || 'No pudimos completar la operación.',
    unavailableItems: data.unavailableItems || [],
    retryAfterSeconds: data.retryAfterSeconds || null,
    status: error.response?.status || null,
  };
};

const selfServiceService = {
  /** Catálogo filtrado por el backend: solo productos publicados y disponibles. */
  getMenu: async () => {
    try {
      const response = await api.get('/self-service/menu');
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /** Versión ligera para el polling: estado del módulo, de la caja y versión del menú. */
  getStatus: async () => {
    try {
      const response = await api.get('/self-service/status');
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /**
   * Crea el pedido. El payload solo lleva productos, extras, el nombre y el comentario:
   * el backend fuerza sección, medio de pago, descuento y propina, y recalcula el total.
   */
  createOrder: async ({ foods, customerName, comment }) => {
    try {
      const response = await api.post('/self-service/order', { foods, customerName, comment });
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /**
   * Crea el pedido de un pago con tarjeta ya aprobado. Solo viaja el id de la sesión: el
   * backend arma el pedido con el carrito que se cobró. Reintentarlo es seguro: si el pedido
   * ya existe, devuelve el mismo.
   */
  createPaidOrder: async (paymentSessionId) => {
    try {
      const response = await api.post('/self-service/order', { paymentSessionId });
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /** Envía el cobro al POS asociado a este kiosco. paymentMethod: 'credito' | 'debito'. */
  createPayment: async ({ foods, customerName, comment, paymentMethod }) => {
    try {
      const response = await api.post('/self-service/payment', { foods, customerName, comment, paymentMethod });
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /** Estado del cobro (el backend consulta al proveedor). */
  getPayment: async (sessionId) => {
    try {
      const response = await api.get(`/self-service/payment/${sessionId}`);
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },

  /** Cobros aprobados sin pedido o abiertos recientes de este kiosco (recuperación). */
  getPendingPayments: async () => {
    try {
      const response = await api.get('/self-service/payment/pending');
      return { ok: true, data: response.data };
    } catch (error) {
      return extractError(error);
    }
  },
};

export default selfServiceService;
