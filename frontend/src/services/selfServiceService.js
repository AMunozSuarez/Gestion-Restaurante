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
};

export default selfServiceService;
