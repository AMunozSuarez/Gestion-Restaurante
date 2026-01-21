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
 * POST /api/webhooks/mercadopago
 * Webhook para recibir notificaciones de MercadoPago
 */
router.post('/mercadopago', handleMercadoPagoWebhook);

/**
 * POST /api/webhooks/paypal
 * Webhook para recibir notificaciones de PayPal
 */
router.post('/paypal', handlePayPalWebhook);

module.exports = router;
