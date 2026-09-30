const mongoose = require('mongoose');
const Restaurant = require('../models/restaurantModel');
const { decryptSecret } = require('../utils/secretCrypto');
const haulmer = require('../services/haulmerRemotePaymentService');

/**
 * Herramientas del super_admin para dejar funcionando el pago remoto de un restaurante sin
 * pasar por el kiosco: envía un cobro de prueba de $100 al POS y consulta su estado. Sirve
 * para validar la API Key y la serie antes de activar el módulo (el cobro se anula en el POS).
 */

const TEST_AMOUNT = 100;

const loadRestaurantApiKey = async (restaurantId) => {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) return { error: 'Restaurante inválido' };
    const restaurant = await Restaurant.findById(restaurantId)
        .select('+paymentIntegrations.haulmer.apiKeyEncrypted settings')
        .lean();
    if (!restaurant) return { error: 'Restaurante no encontrado', status: 404 };
    const encrypted = restaurant.paymentIntegrations?.haulmer?.apiKeyEncrypted;
    if (!encrypted) return { error: 'Este restaurante no tiene API Key de Haulmer cargada.' };
    return { apiKey: decryptSecret(encrypted), settings: Restaurant.normalizeSettings(restaurant.settings || {}) };
};

const sendError = (res, error) => {
    if (error instanceof haulmer.HaulmerError) {
        return res.status(error.isRateLimited ? 429 : 502).json({
            success: false,
            code: error.code,
            message: error.message,
            providerMessage: error.providerMessage,
            retryAfterSeconds: error.retryAfterSeconds || undefined,
            raw: error.raw,
        });
    }
    console.error('Error en prueba de pago remoto:', error);
    return res.status(500).json({ success: false, code: error.code, message: error.message || 'Error interno del servidor' });
};

// POST /api/admin/restaurants/:id/remote-payment/test  { device, paymentMethod }
const testRemotePayment = async (req, res) => {
    try {
        const device = String(req.body.device || '').trim();
        const paymentMethod = req.body.paymentMethod === 'credito' ? 'credito' : 'debito';
        if (!device) {
            return res.status(400).json({ success: false, message: 'Ingresa el número de serie del POS.' });
        }

        const { apiKey, settings, error, status } = await loadRestaurantApiKey(req.params.id);
        if (error) return res.status(status || 400).json({ success: false, message: error });

        // Máx. 36 caracteres; el prefijo permite reconocer las pruebas en el Espacio de Trabajo.
        const idempotencyKey = `TEST-${Date.now()}`;
        const result = await haulmer.createPayment({
            apiKey,
            device,
            amount: TEST_AMOUNT,
            paymentMethod,
            dteType: settings.selfService.remotePayment.dteType,
            idempotencyKey,
            description: 'Prueba OrdenPlus',
        });

        res.status(201).json({
            success: true,
            message: 'Cobro de prueba enviado. Revisa el POS (debe estar en Modo Integración).',
            idempotencyKey,
            status: result.status,
            raw: result.raw,
        });
    } catch (error) {
        sendError(res, error);
    }
};

// GET /api/admin/restaurants/:id/remote-payment/test/:key
const getTestRemotePayment = async (req, res) => {
    try {
        const { apiKey, error, status } = await loadRestaurantApiKey(req.params.id);
        if (error) return res.status(status || 400).json({ success: false, message: error });

        const result = await haulmer.getPayment({ apiKey, idempotencyKey: req.params.key });
        res.status(200).json({ success: true, status: result.status, raw: result.raw });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = { testRemotePayment, getTestRemotePayment };
