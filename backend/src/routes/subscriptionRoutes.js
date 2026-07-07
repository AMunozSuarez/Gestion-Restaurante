const express = require('express');
const {
    getPlans,
    getCurrentSubscription,
    createSubscription,
    updateSubscription,
    upgradePlan,
    cancelSubscriptionHandler,
    getPaymentHistory,
    getAllSubscriptions,
    getStats,
    initiateCheckout,
    confirmManualPayment,
    verifyMercadoPagoPayment,
} = require('../controllers/subscriptionController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');

const router = express.Router();

// Rutas públicas (no requieren autenticación)
/**
 * GET /api/subscriptions/plans
 * Obtener todos los planes disponibles
 */
router.get('/plans', getPlans);

// Rutas protegidas (requieren autenticación)
/**
 * GET /api/subscriptions/current
 * Obtener la suscripción actual del usuario autenticado
 */
router.get('/current', authMiddleware, denyRoleMiddleware('mesero'), getCurrentSubscription);

/**
 * GET /api/subscriptions/:subscriptionId/history
 * Obtener historial de pagos de una suscripción
 */
router.get('/:subscriptionId/history', authMiddleware, denyRoleMiddleware('mesero'), getPaymentHistory);

/**
 * POST /api/subscriptions/checkout
 * Iniciar proceso de checkout
 */
router.post('/checkout', authMiddleware, denyRoleMiddleware('mesero'), initiateCheckout);

/**
 * GET /api/subscriptions/verify-payment
 * Verificar pago de MercadoPago después de la redirección
 */
router.get('/verify-payment', verifyMercadoPagoPayment);

/**
 * POST /api/subscriptions/create
 * Crear una nueva suscripción
 */
router.post('/create', authMiddleware, denyRoleMiddleware('mesero'), createSubscription);

/**
 * PUT /api/subscriptions/:subscriptionId/renew
 * Renovar una suscripción existente
 */
router.put('/:subscriptionId/renew', authMiddleware, denyRoleMiddleware('mesero'), updateSubscription);

/**
 * PUT /api/subscriptions/:subscriptionId/upgrade
 * Cambiar el plan de una suscripción
 */
router.put('/:subscriptionId/upgrade', authMiddleware, denyRoleMiddleware('mesero'), upgradePlan);

/**
 * PUT /api/subscriptions/:subscriptionId/cancel
 * Cancelar una suscripción
 */
router.put('/:subscriptionId/cancel', authMiddleware, denyRoleMiddleware('mesero'), cancelSubscriptionHandler);

// Rutas de administrador (solo super_admin)
/**
 * GET /api/subscriptions/admin/all
 * Obtener todas las suscripciones (con paginación y filtros)
 */
router.get('/admin/all', authMiddleware, checkRole('super_admin'), getAllSubscriptions);

/**
 * GET /api/subscriptions/admin/stats
 * Obtener estadísticas de suscripciones
 */
router.get('/admin/stats', authMiddleware, checkRole('super_admin'), getStats);

/**
 * POST /api/subscriptions/admin/:subscriptionId/confirm-payment
 * Confirmar pago manual (para pagos por transferencia, etc.)
 */
router.post(
    '/admin/:subscriptionId/confirm-payment',
    authMiddleware,
    checkRole('super_admin'),
    confirmManualPayment
);

module.exports = router;
