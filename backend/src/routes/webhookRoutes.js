const express = require('express');
const {
    handleStripeWebhook,
    handleMercadoPagoWebhook,
    handlePayPalWebhook,
} = require('../controllers/webhookController');

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * Webhook para recibir notificaciones de Stripe
 * Nota: Este endpoint debe tener express.raw() para validar la firma
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

/**
 * POST/GET /api/webhooks/mercadopago
 * Webhook para recibir notificaciones de MercadoPago
 * MercadoPago puede enviar notificaciones tanto por POST como por GET
 */
router.post('/mercadopago', handleMercadoPagoWebhook);
router.get('/mercadopago', handleMercadoPagoWebhook);

/**
 * POST/GET en raíz (para pruebas de MercadoPago)
 * Las pruebas de MercadoPago a veces envían a la raíz del dominio
 */
router.post('/', handleMercadoPagoWebhook);
router.get('/', handleMercadoPagoWebhook);

/**
 * POST /api/webhooks/paypal
 * Webhook para recibir notificaciones de PayPal
 */
router.post('/paypal', handlePayPalWebhook);

module.exports = router;
