const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');
const {
    renewSubscription,
    recordPayment,
    recordNotification,
    calculateEndDate,
} = require('../utils/subscriptionUtils');
const {
    processNotification,
    getPaymentInfo,
    getRecurringSubscription,
} = require('../services/mercadoPagoService');

/**
 * Webhook para Stripe
 * Maneja eventos de pago de Stripe
 */
const handleStripeWebhook = async (req, res) => {
    try {
        const event = req.body;

        console.log('Stripe webhook recibido:', event.type);

        switch (event.type) {
            case 'checkout.session.completed':
                await handleStripeCheckoutCompleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleStripePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleStripePaymentFailed(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleStripeSubscriptionDeleted(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleStripeSubscriptionUpdated(event.data.object);
                break;

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error en webhook de Stripe:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar webhook',
            error: error.message,
        });
    }
};

/**
 * Webhook para MercadoPago
 * Maneja notificaciones de pago de MercadoPago
 */
const handleMercadoPagoWebhook = async (req, res) => {
    try {
        // MercadoPago puede enviar notificaciones por GET o POST
        // Por query params (GET): ?type=payment&id=123
        // Por body (POST): { action, data: { id }, type }
        const queryParams = req.query || {};
        const bodyParams = req.body || {};
        
        // Intentar obtener datos de query o body
        const type = queryParams.type || bodyParams.type || bodyParams.action;
        const id = queryParams.id || queryParams['data.id'] || bodyParams.data?.id;
        const topic = queryParams.topic;
        
        const notificationType = type || topic;
        const resourceId = id;

        console.log('MercadoPago webhook recibido:', { 
            method: req.method,
            notificationType, 
            resourceId,
            query: req.query,
            body: req.body 
        });

        // Responder rápidamente a MercadoPago (importante)
        res.status(200).json({ success: true });

        // Procesar la notificación de forma asíncrona
        if (!notificationType || !resourceId) {
            console.log('⚠️ Notificación sin tipo o ID - ignorando');
            return;
        }

        // Procesar según el tipo (eliminar "payment." prefix si existe)
        const cleanType = notificationType.replace('payment.', '');
        
        switch (cleanType) {
            case 'payment':
            case 'updated':
            case 'created':
                await handleMercadoPagoPayment(resourceId);
                break;

            case 'merchant_order':
                console.log('Orden de mercado recibida:', resourceId);
                // Opcional: procesar órdenes si es necesario
                break;

            case 'preapproval':
            case 'subscription_preapproval':
                await handleMercadoPagoSubscription(resourceId);
                break;

            default:
                console.log(`Tipo no manejado: ${notificationType}`);
        }
    } catch (error) {
        console.error('❌ Error en webhook de MercadoPago:', error);
        // No enviar error al cliente, ya respondimos antes
    }
};

/**
 * Webhook para PayPal
 * Maneja eventos de pago de PayPal
 */
const handlePayPalWebhook = async (req, res) => {
    try {
        const event = req.body;

        console.log('PayPal webhook recibido:', event.event_type);

        switch (event.event_type) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
                await handlePayPalSubscriptionActivated(event.resource);
                break;

            case 'BILLING.SUBSCRIPTION.CANCELLED':
                await handlePayPalSubscriptionCancelled(event.resource);
                break;

            case 'PAYMENT.SALE.COMPLETED':
                await handlePayPalPaymentCompleted(event.resource);
                break;

            default:
                console.log(`Evento no manejado: ${event.event_type}`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error en webhook de PayPal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar webhook',
            error: error.message,
        });
    }
};

// ==================== Handlers de Stripe ====================

async function handleStripeCheckoutCompleted(session) {
    const { metadata, subscription: stripeSubscriptionId, customer, amount_total } = session;

    const subscriptionId = metadata?.subscriptionId;
    if (!subscriptionId) {
        console.error('No se encontró subscriptionId en metadata');
        return;
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
        console.error('Suscripción no encontrada');
        return;
    }

    // Actualizar suscripción con datos de pago
    subscription.status = 'active';
    subscription.subscriptionId = stripeSubscriptionId;
    subscription.paymentProvider = 'stripe';
    subscription.lastPaymentDate = new Date();

    await recordPayment(subscriptionId, {
        amount: amount_total / 100, // Stripe usa centavos
        status: 'success',
        paymentId: session.payment_intent,
    });

    await subscription.save();

    // Actualizar restaurante
    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionStatus: 'active',
        isSuspended: false,
    });

    console.log(`Suscripción ${subscriptionId} activada exitosamente`);
}

async function handleStripePaymentSucceeded(invoice) {
    const { subscription: stripeSubscriptionId, amount_paid, hosted_invoice_url } = invoice;

    const subscription = await Subscription.findOne({
        subscriptionId: stripeSubscriptionId,
    });

    if (!subscription) {
        console.error('Suscripción no encontrada para renovación');
        return;
    }

    // Si es una renovación automática
    if (subscription.autoRenew) {
        await renewSubscription(subscription._id, {
            amount: amount_paid / 100,
            provider: 'stripe',
            paymentId: invoice.payment_intent,
            subscriptionId: stripeSubscriptionId,
            invoiceUrl: hosted_invoice_url,
        });
    } else {
        // Solo registrar el pago
        await recordPayment(subscription._id, {
            amount: amount_paid / 100,
            status: 'success',
            paymentId: invoice.payment_intent,
            invoiceUrl: hosted_invoice_url,
        });
    }

    console.log(`Pago exitoso para suscripción ${subscription._id}`);
}

async function handleStripePaymentFailed(invoice) {
    const { subscription: stripeSubscriptionId, attempt_count } = invoice;

    const subscription = await Subscription.findOne({
        subscriptionId: stripeSubscriptionId,
    });

    if (!subscription) return;

    await recordPayment(subscription._id, {
        amount: invoice.amount_due / 100,
        status: 'failed',
        paymentId: invoice.payment_intent,
    });

    await recordNotification(subscription._id, 'payment_failed', 'email');

    console.log(`Pago fallido para suscripción ${subscription._id}, intento ${attempt_count}`);
}

async function handleStripeSubscriptionDeleted(stripeSubscription) {
    const subscription = await Subscription.findOne({
        subscriptionId: stripeSubscription.id,
    });

    if (!subscription) return;

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionStatus: 'cancelled',
    });

    console.log(`Suscripción ${subscription._id} cancelada`);
}

async function handleStripeSubscriptionUpdated(stripeSubscription) {
    const subscription = await Subscription.findOne({
        subscriptionId: stripeSubscription.id,
    });

    if (!subscription) return;

    // Actualizar estado si cambió
    if (stripeSubscription.status === 'canceled' && subscription.status !== 'cancelled') {
        subscription.status = 'cancelled';
        await subscription.save();
    }

    console.log(`Suscripción ${subscription._id} actualizada`);
}

// ==================== Handlers de MercadoPago ====================

async function handleMercadoPagoPayment(paymentId) {
    try {
        console.log(`Procesando pago de MercadoPago: ${paymentId}`);
        
        // Obtener información del pago
        const payment = await getPaymentInfo(paymentId);
        
        console.log('Estado del pago:', payment.status);
        console.log('Monto:', payment.transaction_amount);

        // Solo procesar pagos aprobados
        if (payment.status !== 'approved') {
            console.log(`Pago no aprobado. Estado: ${payment.status}`);
            return;
        }

        // Obtener la referencia externa (contiene restaurantId y plan)
        const reference = JSON.parse(payment.external_reference || '{}');
        const { restaurantId, plan, type } = reference;

        if (!restaurantId || !plan) {
            console.error('Referencia externa inválida:', payment.external_reference);
            return;
        }

        // Verificar si ya existe una suscripción con este paymentId (anti-duplicado)
        const existingByPayment = await Subscription.findOne({ paymentId: payment.id.toString() });
        if (existingByPayment) {
            console.log('Pago ya procesado anteriormente');
            return;
        }

        const planConfig = Subscription.schema.statics.getPlanConfig(plan);

        // 1. ¿Tiene suscripción activa? → extender fecha
        const existingActive = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['active', 'trial'] },
        }).sort({ createdAt: -1 });

        if (existingActive) {
            console.log('Suscripción activa encontrada - extendiendo fecha en 30 días');
            const newEndDate = calculateEndDate(new Date(existingActive.endDate), plan);
            existingActive.paymentId = payment.id.toString();
            existingActive.lastPaymentDate = new Date(payment.date_approved);
            existingActive.endDate = newEndDate;
            existingActive.paymentHistory.push({
                date: new Date(payment.date_approved),
                amount: payment.transaction_amount,
                status: 'success',
                paymentId: payment.id.toString(),
            });
            await existingActive.save();

            await Restaurant.findByIdAndUpdate(restaurantId, {
                subscriptionEndDate: newEndDate,
                lastPaymentDate: new Date(payment.date_approved),
            });

            console.log(`Suscripción ${existingActive._id} extendida hasta ${newEndDate.toISOString()}`);
            await recordNotification(existingActive._id, 'renewed', 'email');
            return;
        }

        // 2. ¿Tiene suscripción suspendida/expirada/cancelada? → reactivar
        const existingInactive = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['suspended', 'expired', 'cancelled'] },
        }).sort({ createdAt: -1 });

        if (existingInactive) {
            console.log('Suscripción inactiva encontrada - reactivando');
            const newEndDate = calculateEndDate(new Date(), plan);
            existingInactive.plan = plan;
            existingInactive.status = 'active';
            existingInactive.paymentId = payment.id.toString();
            existingInactive.lastPaymentDate = new Date(payment.date_approved);
            existingInactive.startDate = new Date();
            existingInactive.endDate = newEndDate;
            existingInactive.amount = payment.transaction_amount;
            existingInactive.paymentProvider = 'mercadopago';
            existingInactive.paymentHistory.push({
                date: new Date(payment.date_approved),
                amount: payment.transaction_amount,
                status: 'success',
                paymentId: payment.id.toString(),
            });
            await existingInactive.save();

            await Restaurant.findByIdAndUpdate(restaurantId, {
                currentSubscription: existingInactive._id,
                subscriptionStatus: 'active',
                subscriptionPlan: plan,
                subscriptionStartDate: new Date(),
                subscriptionEndDate: newEndDate,
                lastPaymentDate: new Date(payment.date_approved),
                isSuspended: false,
                suspensionReason: null,
            });

            console.log(`Suscripción ${existingInactive._id} reactivada hasta ${newEndDate.toISOString()}`);
            await recordNotification(existingInactive._id, 'renewed', 'email');
            return;
        }

        // 3. Sin suscripción previa → crear nueva
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, plan);

        const newSubscription = new Subscription({
            restaurant: restaurantId,
            plan,
            status: 'active',
            startDate,
            endDate,
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            paymentProvider: 'mercadopago',
            paymentId: payment.id.toString(),
            lastPaymentDate: new Date(payment.date_approved),
            autoRenew: false,
            features: planConfig.features,
            paymentHistory: [{
                date: new Date(payment.date_approved),
                amount: payment.transaction_amount,
                status: 'success',
                paymentId: payment.id.toString(),
            }],
        });

        await newSubscription.save();

        await Restaurant.findByIdAndUpdate(restaurantId, {
            currentSubscription: newSubscription._id,
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            lastPaymentDate: new Date(payment.date_approved),
            isSuspended: false,
            suspensionReason: null,
        });

        console.log(`Nueva suscripción creada para restaurante ${restaurantId}`);
        await recordNotification(newSubscription._id, 'renewed', 'email');

    } catch (error) {
        console.error('Error al procesar pago de MercadoPago:', error);
    }
}


async function handleMercadoPagoSubscription(preapprovalId) {
    try {
        console.log(`Procesando suscripción de MercadoPago: ${preapprovalId}`);
        
        // Obtener información de la preaprobación
        const preapproval = await getRecurringSubscription(preapprovalId);
        
        console.log('Estado de la suscripción:', preapproval.status);

        const reference = JSON.parse(preapproval.external_reference || '{}');
        const { restaurantId, plan } = reference;

        if (!restaurantId || !plan) {
            console.error('Referencia externa inválida');
            return;
        }

        // Buscar la suscripción existente
        let subscription = await Subscription.findOne({
            restaurant: restaurantId,
            subscriptionId: preapproval.id,
        });

        if (preapproval.status === 'authorized') {
            // Suscripción autorizada, crear o actualizar
            if (!subscription) {
                const planConfig = Subscription.schema.statics.getPlanConfig(plan);
                const startDate = new Date();
                const endDate = calculateEndDate(startDate, plan);

                subscription = new Subscription({
                    restaurant: restaurantId,
                    plan,
                    status: 'active',
                    startDate,
                    endDate,
                    amount: preapproval.auto_recurring.transaction_amount,
                    currency: preapproval.auto_recurring.currency_id,
                    paymentProvider: 'mercadopago',
                    subscriptionId: preapproval.id,
                    autoRenew: true,
                    features: planConfig.features,
                });

                await subscription.save();

                await Restaurant.findByIdAndUpdate(restaurantId, {
                    currentSubscription: subscription._id,
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan,
                    subscriptionStartDate: startDate,
                    subscriptionEndDate: endDate,
                });

                console.log('Suscripción recurrente creada');
            }
        } else if (preapproval.status === 'cancelled' && subscription) {
            // Suscripción cancelada
            subscription.status = 'cancelled';
            subscription.cancelledAt = new Date();
            subscription.autoRenew = false;
            await subscription.save();

            await Restaurant.findByIdAndUpdate(restaurantId, {
                subscriptionStatus: 'cancelled',
            });

            console.log('Suscripción recurrente cancelada');
        }

    } catch (error) {
        console.error('Error al procesar suscripción de MercadoPago:', error);
    }
}

// ==================== Handlers de PayPal ====================

async function handlePayPalSubscriptionActivated(resource) {
    console.log(`Suscripción de PayPal activada: ${resource.id}`);
    // Implementar lógica similar a Stripe
}

async function handlePayPalSubscriptionCancelled(resource) {
    console.log(`Suscripción de PayPal cancelada: ${resource.id}`);
}

async function handlePayPalPaymentCompleted(resource) {
    console.log(`Pago de PayPal completado: ${resource.id}`);
}

module.exports = {
    handleStripeWebhook,
    handleMercadoPagoWebhook,
    handlePayPalWebhook,
};
