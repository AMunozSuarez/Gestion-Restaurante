const mongoose = require('mongoose');
const foodModel = require('../models/foodModel');
const orderModel = require('../models/orderModel');
const userModel = require('../models/userModel');
const Restaurant = require('../models/restaurantModel');
const KioskPaymentSession = require('../models/kioskPaymentSessionModel');
const { sanitizeCustomerInput, isCashRegisterOpen } = require('./selfServiceController');
const { validateSelectedExtras, computeFoodsTotal } = require('../utils/orderItems');
const { decryptSecret } = require('../utils/secretCrypto');
const haulmer = require('../services/haulmerRemotePaymentService');

/**
 * Pago remoto del autoservicio (POS Haulmer/TUU).
 *
 * El pedido NO existe hasta que el POS confirma el pago:
 *   1. POST /self-service/payment        → valida el carrito, calcula el total y envía el cobro
 *   2. GET  /self-service/payment/:id    → el kiosco consulta el estado (el backend pregunta a Haulmer)
 *   3. POST /self-service/order {paymentSessionId} → resolvePaidSessionPayload arma el pedido
 *      desde la sesión y lo pasa al MISMO createOrderController del POS.
 */

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 99999999;
// Haulmer permite 1 solicitud de creación por minuto por terminal.
const DEVICE_COOLDOWN_MS = 60 * 1000;
// Evita consultar a Haulmer más seguido que esto aunque varios polls lleguen juntos.
const PROVIDER_CHECK_MIN_INTERVAL_MS = 2000;
// Lock de `finalizing`: si el proceso muere creando el pedido, pasado esto se puede reintentar.
const FINALIZE_LOCK_MS = 60 * 1000;
// Si Haulmer dice que el cobro no existe (RP-200) pasado este tiempo, se da por fallido.
const NOT_FOUND_GRACE_MS = 2 * 60 * 1000;
// Ventana de recuperación: sesiones abiertas más antiguas no se reconsultan.
const RECOVERY_WINDOW_MS = 60 * 60 * 1000;

const ACTIVE_STATUSES = ['pending', 'sent', 'processing'];
const ORDER_PAYMENT_BY_METHOD = { credito: 'Credito', debito: 'Debito' };

const publicSession = (session) => ({
    _id: session._id,
    status: session.status,
    amount: session.amount,
    paymentMethod: session.paymentMethod,
    customerName: session.cartSnapshot?.customerName || '',
    errorCode: session.errorCode || null,
    errorMessage: session.errorMessage || null,
    order: session.order || null,
    createdAt: session.createdAt,
    paidAt: session.paidAt || null,
});

const loadApiKey = async (restaurantId) => {
    const restaurant = await Restaurant.findById(restaurantId)
        .select('+paymentIntegrations.haulmer.apiKeyEncrypted')
        .lean();
    const encrypted = restaurant?.paymentIntegrations?.haulmer?.apiKeyEncrypted;
    if (!encrypted) return null;
    return decryptSecret(encrypted);
};

const haulmerErrorResponse = (error) => ({
    success: false,
    code: error.code,
    message: error.message,
    retryAfterSeconds: error.retryAfterSeconds || undefined,
});

/**
 * Consulta el estado del cobro en Haulmer y lo guarda. No lanza: un error transitorio deja
 * la sesión como estaba para que el siguiente poll reintente.
 */
const refreshSessionFromProvider = async (session, { apiKey, force = false } = {}) => {
    if (!ACTIVE_STATUSES.includes(session.status)) return session;

    const lastChecked = session.lastCheckedAt ? session.lastCheckedAt.getTime() : 0;
    if (!force && Date.now() - lastChecked < PROVIDER_CHECK_MIN_INTERVAL_MS) return session;

    session.lastCheckedAt = new Date();

    try {
        const key = apiKey || await loadApiKey(session.restaurant);
        if (!key) return session;

        const result = await haulmer.getPayment({ apiKey: key, idempotencyKey: String(session._id) });
        if (result.status) {
            session.status = result.status;
            session.providerStatus = result.status;
        }
        if (result.providerId) session.providerId = String(result.providerId);
        session.providerResponse = result.raw;
        if (session.status === 'completed' && !session.paidAt) session.paidAt = new Date();
    } catch (error) {
        if (error instanceof haulmer.HaulmerError && error.code === 'RP-200'
            && Date.now() - session.createdAt.getTime() > NOT_FOUND_GRACE_MS) {
            session.status = 'failed';
            session.errorCode = error.code;
            session.errorMessage = error.message;
        } else {
            console.warn(`[pago-remoto] No se pudo consultar la sesión ${session._id}:`, error.code || error.message);
        }
    }

    await session.save();
    return session;
};

// POST /api/self-service/payment
// Va después de assertSelfServiceEnabled y validateSelfServiceItems (productos publicados y
// disponibles). Aquí se completa lo que createOrderController validaría, pero ANTES de cobrar.
const createPaymentSession = async (req, res) => {
    try {
        const settings = req.selfServiceSettings;
        const restaurantId = req.user.restaurant;

        if (!settings.remotePayment?.enabled) {
            return res.status(403).json({
                success: false,
                code: 'REMOTE_PAYMENT_DISABLED',
                message: 'El pago con tarjeta no está habilitado en este kiosco.',
            });
        }

        const paymentMethod = String(req.body.paymentMethod || '').toLowerCase();
        if (!ORDER_PAYMENT_BY_METHOD[paymentMethod]) {
            return res.status(400).json({ success: false, code: 'INVALID_PAYMENT_METHOD', message: 'Elige crédito o débito.' });
        }

        const { error: customerError, customerName, comment } = sanitizeCustomerInput(settings, req.body);
        if (customerError) {
            return res.status(400).json(customerError);
        }

        const [kioskUser, apiKey, cashRegisterOpen] = await Promise.all([
            userModel.findById(req.user.id).select('kioskDevice').lean(),
            loadApiKey(restaurantId),
            isCashRegisterOpen(restaurantId),
        ]);

        const device = kioskUser?.kioskDevice?.serial;
        if (!apiKey || !device) {
            return res.status(503).json({
                success: false,
                code: 'REMOTE_PAYMENT_NOT_CONFIGURED',
                message: 'El pago con tarjeta no está configurado en este kiosco. Avisa al personal.',
            });
        }

        // Se valida la caja ANTES de cobrar: createOrderController rechaza sin caja abierta.
        if (!cashRegisterOpen) {
            return res.status(400).json({
                success: false,
                code: 'NO_CASH_REGISTER',
                message: 'No hay una caja abierta.',
            });
        }

        // Copia limpia del carrito: solo los campos que createOrderController usa.
        const foods = req.body.foods.map((item) => ({
            food: String(item.food),
            quantity: Number(item.quantity),
            selectedExtras: (Array.isArray(item.selectedExtras) ? item.selectedExtras : []).map((extra) => ({
                sectionId: extra.sectionId,
                extraId: extra.extraId,
                sectionName: extra.sectionName,
                extraName: extra.extraName,
                price: extra.price,
            })),
        }));

        const uniqueFoodIds = [...new Set(foods.map((item) => item.food))];
        const existingFoods = await foodModel
            .find({ _id: { $in: uniqueFoodIds }, restaurant: restaurantId })
            .select('_id price extraSections')
            .populate('extraSections.section', 'sectionName maxSelection extras')
            .lean();

        if (existingFoods.length !== uniqueFoodIds.length) {
            return res.status(409).json({ success: false, code: 'ITEMS_UNAVAILABLE', message: 'Algunos productos ya no están disponibles.' });
        }

        const foodMap = new Map(existingFoods.map((food) => [String(food._id), food]));
        const extrasError = validateSelectedExtras(foods, foodMap);
        if (extrasError) {
            return res.status(400).json({ success: false, code: 'INVALID_EXTRAS', message: extrasError });
        }

        const amount = computeFoodsTotal(foods, foodMap);
        if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
            return res.status(400).json({
                success: false,
                code: 'AMOUNT_OUT_OF_RANGE',
                message: `El total debe estar entre $${MIN_AMOUNT} y $${MAX_AMOUNT} para pagar con tarjeta.`,
            });
        }

        // Cooldown por terminal: Haulmer rechaza (429) más de 1 cobro por minuto. Se ataja aquí
        // para darle al cliente un tiempo de espera exacto sin gastar la cuota.
        const lastSent = await KioskPaymentSession.findOne({
            device,
            providerStatus: { $ne: null },
            createdAt: { $gt: new Date(Date.now() - DEVICE_COOLDOWN_MS) },
        }).sort({ createdAt: -1 }).select('createdAt').lean();

        if (lastSent) {
            const retryAfterSeconds = Math.ceil((lastSent.createdAt.getTime() + DEVICE_COOLDOWN_MS - Date.now()) / 1000);
            return res.status(429).json({
                success: false,
                code: 'DEVICE_COOLDOWN',
                message: 'El POS está ocupado. Intenta en unos segundos.',
                retryAfterSeconds: Math.max(retryAfterSeconds, 1),
            });
        }

        const session = await KioskPaymentSession.create({
            restaurant: restaurantId,
            kioskUser: req.user.id,
            device,
            amount,
            paymentMethod,
            dteType: settings.remotePayment.dteType,
            cartSnapshot: { foods, customerName, comment },
        });

        try {
            const result = await haulmer.createPayment({
                apiKey,
                device,
                amount,
                paymentMethod,
                dteType: settings.remotePayment.dteType,
                idempotencyKey: String(session._id),
                description: customerName ? `Autoservicio ${customerName}` : 'Pedido autoservicio',
            });
            session.status = result.status && ACTIVE_STATUSES.concat(haulmer.TERMINAL_STATUSES).includes(result.status)
                ? result.status
                : 'sent';
            session.providerStatus = session.status;
            if (result.providerId) session.providerId = String(result.providerId);
            session.providerResponse = result.raw;
            session.lastCheckedAt = new Date();
            if (session.status === 'completed') session.paidAt = new Date();
            await session.save();
        } catch (error) {
            if (!(error instanceof haulmer.HaulmerError)) throw error;

            if (error.network) {
                // Timeout o corte: el cobro pudo haber llegado. Se deja en `pending` y el poll
                // lo resuelve con GetPaymentRequest (misma idempotencyKey, sin doble cobro).
                session.providerStatus = 'unknown';
                session.errorCode = error.code;
                await session.save();
                return res.status(201).json({ success: true, session: publicSession(session) });
            }

            session.status = 'failed';
            session.errorCode = error.code;
            session.errorMessage = error.message;
            session.providerResponse = error.raw || null;
            await session.save();

            console.warn(`[pago-remoto] Haulmer rechazó el cobro ${session._id}: ${error.code} ${error.providerMessage || ''}`);
            return res.status(error.isRateLimited ? 429 : 502).json(haulmerErrorResponse(error));
        }

        res.status(201).json({ success: true, session: publicSession(session) });
    } catch (error) {
        console.error('Error creando la sesión de pago remoto:', error);
        res.status(500).json({ success: false, message: 'Error iniciando el pago con tarjeta' });
    }
};

const findKioskSession = (req, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return KioskPaymentSession.findOne({ _id: id, restaurant: req.user.restaurant, kioskUser: req.user.id });
};

// GET /api/self-service/payment/:id
const getPaymentSession = async (req, res) => {
    try {
        const session = await findKioskSession(req, req.params.id);
        if (!session) {
            return res.status(404).json({ success: false, code: 'PAYMENT_NOT_FOUND', message: 'Pago no encontrado.' });
        }

        await refreshSessionFromProvider(session);
        res.status(200).json({ success: true, session: publicSession(session) });
    } catch (error) {
        console.error('Error consultando la sesión de pago remoto:', error);
        res.status(500).json({ success: false, message: 'Error consultando el pago' });
    }
};

// GET /api/self-service/payment/pending
// Recuperación tras un reinicio del kiosco: pagos aprobados que aún no tienen pedido, y
// cobros abiertos recientes (se reconsultan por si se aprobaron mientras la tablet estaba caída).
const listPendingSessions = async (req, res) => {
    try {
        const sessions = await KioskPaymentSession.find({
            restaurant: req.user.restaurant,
            kioskUser: req.user.id,
            order: null,
            $or: [
                { status: { $in: ['completed', 'finalizing'] } },
                { status: { $in: ACTIVE_STATUSES }, createdAt: { $gt: new Date(Date.now() - RECOVERY_WINDOW_MS) } },
            ],
        }).sort({ createdAt: -1 }).limit(10);

        for (const session of sessions) {
            await refreshSessionFromProvider(session);
        }

        res.status(200).json({ success: true, sessions: sessions.map(publicSession) });
    } catch (error) {
        console.error('Error listando pagos pendientes:', error);
        res.status(500).json({ success: false, message: 'Error listando pagos pendientes' });
    }
};

/**
 * Middleware de POST /self-service/order. Sin paymentSessionId deja pasar el flujo de
 * "pagar en caja" (enforceSelfServiceOrderPayload decide si está permitido). Con
 * paymentSessionId arma el pedido desde la sesión pagada y marca req.paidSelfServiceSession
 * para que los middlewares siguientes y createOrderController lo traten como ya cobrado.
 */
const resolvePaidSessionPayload = async (req, res, next) => {
    const sessionId = req.body?.paymentSessionId;
    if (!sessionId) return next();

    try {
        const session = await findKioskSession(req, sessionId);
        if (!session) {
            return res.status(404).json({ success: false, code: 'PAYMENT_NOT_FOUND', message: 'Pago no encontrado.' });
        }

        // Reintento después de que el pedido ya se creó (p. ej. se perdió la respuesta):
        // se devuelve el mismo pedido en vez de crear otro.
        if (session.status === 'consumed' && session.order) {
            const order = await orderModel.findById(session.order).populate([
                { path: 'foods.food', select: 'title price category' },
                { path: 'buyer', select: 'name phone' },
            ]);
            return res.status(200).json({ success: true, alreadyCreated: true, message: 'Pedido ya creado', order });
        }

        await refreshSessionFromProvider(session, { force: true });

        const now = Date.now();
        const locked = await KioskPaymentSession.findOneAndUpdate(
            {
                _id: session._id,
                order: null,
                $or: [
                    { status: 'completed' },
                    { status: 'finalizing', lockedAt: { $lt: new Date(now - FINALIZE_LOCK_MS) } },
                ],
            },
            { $set: { status: 'finalizing', lockedAt: new Date(now) } },
            { new: true }
        );

        if (!locked) {
            const current = await KioskPaymentSession.findById(session._id);
            const inProgress = current?.status === 'finalizing';
            return res.status(409).json({
                success: false,
                code: inProgress ? 'PAYMENT_FINALIZING' : 'PAYMENT_NOT_COMPLETED',
                message: inProgress ? 'El pedido se está creando.' : 'El pago aún no está aprobado.',
                session: current ? publicSession(current) : undefined,
            });
        }

        const method = ORDER_PAYMENT_BY_METHOD[locked.paymentMethod];
        const provider = locked.providerResponse ? haulmer.normalizePaymentResponse(locked.providerResponse) : {};

        req.paidSelfServiceSession = {
            _id: locked._id,
            amount: locked.amount,
            remotePayment: {
                provider: 'haulmer',
                sessionId: locked._id,
                idempotencyKey: String(locked._id),
                device: locked.device,
                cardType: provider.cardType != null ? String(provider.cardType) : undefined,
                authCode: provider.authCode != null ? String(provider.authCode) : undefined,
                last4: provider.last4 != null ? String(provider.last4) : undefined,
                paidAt: locked.paidAt || new Date(),
                raw: locked.providerResponse,
            },
        };

        const snapshot = locked.cartSnapshot || {};
        req.body = {
            // Copia profunda: createOrderController normaliza los extras in-place.
            foods: JSON.parse(JSON.stringify(snapshot.foods || [])),
            section: 'mostrador',
            orderSource: 'self_service',
            payment: method,
            paymentMethods: [{ method, amount: locked.amount }],
            status: 'Preparacion',
            discount: 0,
            tip: 0,
            comment: snapshot.comment || '',
            buyer: snapshot.customerName ? { name: snapshot.customerName } : undefined,
        };

        // Al terminar la respuesta: si se creó el pedido, la sesión queda `consumed`; si no
        // (p. ej. se cerró la caja entre el cobro y el pedido), vuelve a `completed` para que
        // el kiosco pueda reintentar sin volver a cobrar.
        let responseBody = null;
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            responseBody = body;
            return originalJson(body);
        };

        res.on('finish', () => {
            const orderId = res.statusCode === 201 ? responseBody?.order?._id : null;
            const update = orderId
                ? { $set: { status: 'consumed', order: orderId, lockedAt: null } }
                : { $set: { status: 'completed', lockedAt: null, errorCode: responseBody?.code || null, errorMessage: responseBody?.message || null } };

            KioskPaymentSession.updateOne({ _id: locked._id, status: 'finalizing' }, update)
                .catch((error) => console.error(`[pago-remoto] No se pudo cerrar la sesión ${locked._id}:`, error));

            if (!orderId) {
                console.error(`[pago-remoto] PAGO SIN PEDIDO: sesión ${locked._id} (${res.statusCode} ${responseBody?.code || ''} ${responseBody?.message || ''})`);
            }
        });

        next();
    } catch (error) {
        console.error('Error resolviendo el pago del pedido de autoservicio:', error);
        res.status(500).json({ success: false, message: 'Error verificando el pago' });
    }
};

module.exports = {
    createPaymentSession,
    getPaymentSession,
    listPendingSessions,
    resolvePaidSessionPayload,
    refreshSessionFromProvider,
};
