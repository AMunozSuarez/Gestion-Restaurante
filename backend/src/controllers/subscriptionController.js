const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');
const {
    renewSubscription,
    cancelSubscription,
    changePlan,
    recordPayment,
    getSubscriptionStats,
    calculateEndDate,
} = require('../utils/subscriptionUtils');
const {
    createSubscriptionPreference,
    createRecurringSubscription,
    verifyPayment,
} = require('../services/mercadoPagoService');

/**
 * Obtener todos los planes disponibles
 */
const getPlans = async (req, res) => {
    try {
        const restaurantId = req.user?.restaurant;
        let hasUsedTrial = false;

        // Si el usuario está autenticado, verificar si ya usó el trial
        if (restaurantId) {
            const trialSubscription = await Subscription.findOne({
                restaurant: restaurantId,
                plan: 'trial',
            });
            hasUsedTrial = !!trialSubscription;
        }

        const allPlans = [
            {
                id: 'trial',
                ...Subscription.schema.statics.getPlanConfig('trial'),
            },
            {
                id: 'monthly',
                ...Subscription.schema.statics.getPlanConfig('monthly'),
            },
            // Planes quarterly y yearly comentados - solo mostrar trial y monthly
            // {
            //     id: 'quarterly',
            //     ...Subscription.schema.statics.getPlanConfig('quarterly'),
            // },
            // {
            //     id: 'yearly',
            //     ...Subscription.schema.statics.getPlanConfig('yearly'),
            // },
        ];

        // Filtrar el plan trial si el usuario ya lo usó
        const plans = hasUsedTrial 
            ? allPlans.filter(plan => plan.id !== 'trial')
            : allPlans;

        res.status(200).json({
            success: true,
            data: plans,
            hasUsedTrial,
        });
    } catch (error) {
        console.error('Error al obtener planes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los planes',
            error: error.message,
        });
    }
};

/**
 * Obtener la suscripción actual del restaurante
 */
const getCurrentSubscription = async (req, res) => {
    try {
        const restaurantId = req.user?.restaurant || req.params.restaurantId;

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'ID de restaurante no proporcionado',
            });
        }

        const subscription = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['active', 'trial', 'expired', 'suspended', 'cancelled'] },
        }).sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró suscripción activa',
            });
        }

        const daysRemaining = subscription.getDaysRemaining();
        const isActive = subscription.isActive();
        const isInGracePeriod = subscription.isInGracePeriod();

        res.status(200).json({
            success: true,
            data: {
                subscription,
                daysRemaining,
                isActive,
                isInGracePeriod,
                canAccess: subscription.canAccess(),
            },
        });
    } catch (error) {
        console.error('Error al obtener suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la suscripción',
            error: error.message,
        });
    }
};

/**
 * Crear una nueva suscripción (después del pago)
 */
const createSubscription = async (req, res) => {
    try {
        const { restaurantId, plan, paymentData } = req.body;

        if (!restaurantId || !plan) {
            return res.status(400).json({
                success: false,
                message: 'Restaurante y plan son requeridos',
            });
        }

        // Validar que el plan existe
        const planConfig = Subscription.schema.statics.getPlanConfig(plan);
        if (!planConfig) {
            return res.status(400).json({
                success: false,
                message: 'Plan no válido',
            });
        }

        // Si es un plan trial, verificar que no lo haya usado antes
        if (plan === 'trial') {
            const previousTrial = await Subscription.findOne({
                restaurant: restaurantId,
                plan: 'trial',
            });

            if (previousTrial) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya has usado tu período de prueba gratuito. Por favor, selecciona un plan de pago.',
                });
            }
        }

        // Verificar si ya tiene una suscripción activa
        const existingSubscription = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['active', 'trial'] },
        });

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una suscripción activa. Usa la función de actualizar.',
            });
        }

        // Crear nueva suscripción
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, plan);

        const newSubscription = new Subscription({
            restaurant: restaurantId,
            plan,
            status: plan === 'trial' ? 'active' : 'pending',
            startDate,
            endDate,
            trialEndDate: plan === 'trial' ? endDate : null,
            amount: planConfig.price,
            currency: 'CLP',
            paymentProvider: paymentData?.provider || null,
            paymentId: paymentData?.paymentId || null,
            subscriptionId: paymentData?.subscriptionId || null,
            lastPaymentDate: plan !== 'trial' ? new Date() : null,
            autoRenew: paymentData?.autoRenew || false,
            features: planConfig.features,
        });

        if (paymentData && plan !== 'trial') {
            newSubscription.paymentHistory.push({
                date: new Date(),
                amount: planConfig.price,
                status: 'success',
                paymentId: paymentData.paymentId,
                invoiceUrl: paymentData.invoiceUrl,
            });
            newSubscription.status = 'active';
        }

        await newSubscription.save();

        // Actualizar el restaurante
        await Restaurant.findByIdAndUpdate(restaurantId, {
            currentSubscription: newSubscription._id,
            subscriptionStatus: newSubscription.status,
            subscriptionPlan: plan,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            trialEndDate: plan === 'trial' ? endDate : null,
            lastPaymentDate: newSubscription.lastPaymentDate,
            isSuspended: false,
            suspensionReason: null,
        });

        res.status(201).json({
            success: true,
            message: 'Suscripción creada exitosamente',
            data: newSubscription,
        });
    } catch (error) {
        console.error('Error al crear suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la suscripción',
            error: error.message,
        });
    }
};

/**
 * Actualizar/Renovar suscripción
 */
const updateSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { paymentData } = req.body;

        if (!paymentData) {
            return res.status(400).json({
                success: false,
                message: 'Datos de pago requeridos',
            });
        }

        const renewedSubscription = await renewSubscription(subscriptionId, paymentData);

        res.status(200).json({
            success: true,
            message: 'Suscripción renovada exitosamente',
            data: renewedSubscription,
        });
    } catch (error) {
        console.error('Error al renovar suscripción:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al renovar la suscripción',
            error: error.message,
        });
    }
};

/**
 * Cambiar de plan
 */
const upgradePlan = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { newPlan } = req.body;

        if (!newPlan) {
            return res.status(400).json({
                success: false,
                message: 'Nuevo plan requerido',
            });
        }

        const updatedSubscription = await changePlan(subscriptionId, newPlan);

        res.status(200).json({
            success: true,
            message: 'Plan actualizado exitosamente',
            data: updatedSubscription,
        });
    } catch (error) {
        console.error('Error al cambiar plan:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cambiar el plan',
            error: error.message,
        });
    }
};

/**
 * Cancelar suscripción
 */
const cancelSubscriptionHandler = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { reason } = req.body;

        const cancelledSubscription = await cancelSubscription(subscriptionId, reason);

        res.status(200).json({
            success: true,
            message: 'Suscripción cancelada exitosamente',
            data: cancelledSubscription,
        });
    } catch (error) {
        console.error('Error al cancelar suscripción:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cancelar la suscripción',
            error: error.message,
        });
    }
};

/**
 * Obtener historial de pagos
 */
const getPaymentHistory = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        const subscription = await Subscription.findById(subscriptionId);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada',
            });
        }

        res.status(200).json({
            success: true,
            data: subscription.paymentHistory,
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial de pagos',
            error: error.message,
        });
    }
};

/**
 * Obtener todas las suscripciones (Admin)
 */
const getAllSubscriptions = async (req, res) => {
    try {
        const { status, plan, page = 1, limit = 10 } = req.query;

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);

        const query = {};
        if (status) query.status = status;
        if (plan) query.plan = plan;

        const aggregationResult = await Subscription.aggregate([
            { $match: query },
            { $sort: { restaurant: 1, createdAt: -1 } },
            {
                $group: {
                    _id: '$restaurant',
                    latestSubscription: { $first: '$$ROOT' },
                },
            },
            { $replaceRoot: { newRoot: '$latestSubscription' } },
            {
                $lookup: {
                    from: 'restaurants',
                    localField: 'restaurant',
                    foreignField: '_id',
                    as: 'restaurant',
                },
            },
            {
                $unwind: {
                    path: '$restaurant',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    activePriority: {
                        $cond: [{ $in: ['$status', ['active', 'trial']] }, 0, 1],
                    },
                },
            },
            { $sort: { activePriority: 1, endDate: 1, createdAt: -1 } },
            {
                $facet: {
                    data: [
                        { $skip: (pageNumber - 1) * limitNumber },
                        { $limit: limitNumber },
                        { $project: { activePriority: 0 } },
                    ],
                    totalCount: [{ $count: 'total' }],
                },
            },
        ]);

        const data = aggregationResult?.[0]?.data || [];
        const total = aggregationResult?.[0]?.totalCount?.[0]?.total || 0;
        const totalPages = Math.ceil(total / limitNumber) || 1;

        res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page: pageNumber,
                pages: totalPages,
            },
        });
    } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener suscripciones',
            error: error.message,
        });
    }
};

/**
 * Obtener estadísticas de suscripciones (Admin)
 */
const getStats = async (req, res) => {
    try {
        const stats = await getSubscriptionStats();

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message,
        });
    }
};

/**
 * Iniciar proceso de checkout (preparar datos para pago)
 */
const initiateCheckout = async (req, res) => {
    try {
        const { restaurantId, plan } = req.body;

        if (!restaurantId || !plan) {
            return res.status(400).json({
                success: false,
                message: 'Restaurante y plan son requeridos',
            });
        }

        const planConfig = Subscription.schema.statics.getPlanConfig(plan);

        if (!planConfig) {
            return res.status(400).json({
                success: false,
                message: 'Plan no válido',
            });
        }

        // Obtener información del restaurante
        const restaurant = await Restaurant.findById(restaurantId).populate('owner');
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado',
            });
        }

        // Usar email y nombre del restaurante
        const userEmail = restaurant.email || req.user?.email || 'info@gestion-restaurante.com';
        const userName = restaurant.name || req.user?.userName || 'Usuario';

        // Crear preferencia de pago en MercadoPago
        const preference = await createSubscriptionPreference({
            restaurantId,
            plan,
            planConfig,
            userEmail,
            userName,
        });

        // Si es un plan gratuito, activarlo directamente
        if (preference.isFree) {
            // Buscar o crear suscripción
            let subscription = await Subscription.findOne({ restaurant: restaurantId });
            
            // Calcular fecha de finalización según la duración del plan
            const endDate = new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000);
            
            if (!subscription) {
                subscription = new Subscription({
                    restaurant: restaurantId,
                    plan,
                    status: 'active',
                    paymentStatus: 'paid',
                    startDate: new Date(),
                    endDate: endDate,
                    amount: 0,
                    currency: 'CLP',
                    paymentProvider: 'manual',
                    paymentHistory: [{
                        date: new Date(),
                        amount: 0,
                        status: 'success',
                        paymentId: `trial-${Date.now()}`
                    }]
                });
            } else {
                subscription.plan = plan;
                subscription.status = 'active';
                subscription.paymentStatus = 'paid';
                subscription.startDate = new Date();
                subscription.endDate = endDate;
                subscription.amount = 0;
            }

            await subscription.save();

            return res.status(200).json({
                success: true,
                message: 'Plan de prueba gratuito activado exitosamente',
                data: {
                    isFree: true,
                    subscription: {
                        id: subscription._id,
                        plan: planConfig.name,
                        planId: plan,
                        status: 'active',
                        startDate: subscription.startDate,
                        endDate: subscription.endDate,
                        duration: planConfig.duration
                    }
                },
            });
        }

        const checkoutData = {
            restaurantId,
            plan: planConfig.name,
            planId: plan,
            amount: planConfig.price,
            currency: 'CLP',
            duration: planConfig.duration,
            features: planConfig.features,
            mercadoPago: {
                preferenceId: preference.id,
                initPoint: preference.init_point,
                sandboxInitPoint: preference.sandbox_init_point,
            },
        };

        res.status(200).json({
            success: true,
            message: 'Checkout creado exitosamente',
            data: checkoutData,
        });
    } catch (error) {
        console.error('Error en checkout:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar el proceso de pago',
            error: error.message,
        });
    }
};

/**
 * Confirmar pago manual (Admin)
 */
const confirmManualPayment = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { amount, invoiceUrl, notes } = req.body;

        const paymentData = {
            amount,
            status: 'success',
            paymentId: `manual_${Date.now()}`,
            invoiceUrl,
        };

        const subscription = await recordPayment(subscriptionId, paymentData);

        // Activar la suscripción si estaba pendiente
        if (subscription.status === 'pending') {
            subscription.status = 'active';
            await subscription.save();

            await Restaurant.findByIdAndUpdate(subscription.restaurant, {
                subscriptionStatus: 'active',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pago manual confirmado',
            data: subscription,
        });
    } catch (error) {
        console.error('Error al confirmar pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al confirmar el pago',
            error: error.message,
        });
    }
};

/**
 * Verificar pago de MercadoPago
 * Se llama después de que el usuario completa el pago
 */
const verifyMercadoPagoPayment = async (req, res) => {
    try {
        const { payment_id, external_reference } = req.query;

        if (!payment_id) {
            return res.status(400).json({
                success: false,
                message: 'ID de pago no proporcionado',
            });
        }

        // Verificar el pago con MercadoPago
        const paymentInfo = await verifyPayment(payment_id);

        if (paymentInfo.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Pago no aprobado',
                data: {
                    status: paymentInfo.status,
                    status_detail: paymentInfo.status_detail,
                },
            });
        }

        // Procesar el pago aprobado
        const reference = JSON.parse(paymentInfo.external_reference || external_reference || '{}');
        const { restaurantId, plan } = reference;

        if (!restaurantId || !plan) {
            return res.status(400).json({
                success: false,
                message: 'Referencia externa inválida',
            });
        }

        // ⚠️ VERIFICAR SI YA EXISTE UNA SUSCRIPCIÓN CON ESTE PAGO
        const existingByPayment = await Subscription.findOne({ 
            paymentId: paymentInfo.id.toString() 
        });
        
        if (existingByPayment) {
            console.log('Pago ya procesado anteriormente - devolviendo suscripción existente');
            return res.status(200).json({
                success: true,
                message: 'Suscripción ya activada previamente',
                data: {
                    subscription: existingByPayment,
                    payment: paymentInfo,
                    alreadyProcessed: true,
                },
            });
        }

        // Verificar si ya tiene una suscripción que NO está activa (suspendida, expirada, cancelada)
        // En ese caso, reactivarla y extender la fecha en lugar de crear una nueva
        const existingSuspendedOrExpired = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['suspended', 'expired', 'cancelled'] },
        }).sort({ createdAt: -1 });

        if (existingSuspendedOrExpired) {
            console.log('Suscripción inactiva encontrada - reactivando y extendiendo');
            const planCfg = Subscription.schema.statics.getPlanConfig(plan);
            const newEndDate = calculateEndDate(new Date(), plan);

            existingSuspendedOrExpired.plan = plan;
            existingSuspendedOrExpired.status = 'active';
            existingSuspendedOrExpired.paymentId = paymentInfo.id.toString();
            existingSuspendedOrExpired.lastPaymentDate = new Date(paymentInfo.date_approved);
            existingSuspendedOrExpired.startDate = new Date();
            existingSuspendedOrExpired.endDate = newEndDate;
            existingSuspendedOrExpired.amount = paymentInfo.transaction_amount || paymentInfo.amount;
            existingSuspendedOrExpired.paymentProvider = 'mercadopago';
            existingSuspendedOrExpired.paymentHistory.push({
                date: new Date(paymentInfo.date_approved),
                amount: paymentInfo.transaction_amount || paymentInfo.amount,
                status: 'success',
                paymentId: paymentInfo.id.toString(),
            });
            await existingSuspendedOrExpired.save();

            await Restaurant.findByIdAndUpdate(restaurantId, {
                currentSubscription: existingSuspendedOrExpired._id,
                subscriptionStatus: 'active',
                subscriptionPlan: plan,
                subscriptionStartDate: new Date(),
                subscriptionEndDate: newEndDate,
                lastPaymentDate: new Date(paymentInfo.date_approved),
                isSuspended: false,
                suspensionReason: null,
            });

            return res.status(200).json({
                success: true,
                message: 'Pago verificado y suscripción reactivada',
                data: {
                    subscription: existingSuspendedOrExpired,
                    payment: paymentInfo,
                    reactivated: true,
                },
            });
        }

        // Verificar si ya tiene una suscripción activa (evitar duplicados)
        const existingActive = await Subscription.findOne({
            restaurant: restaurantId,
            status: { $in: ['active', 'trial'] },
        });

        if (existingActive) {
            console.log('Ya existe una suscripción activa - extendiendo en lugar de duplicar');
            const newEndDate = calculateEndDate(new Date(existingActive.endDate), plan);
            existingActive.plan = plan;
            existingActive.paymentId = paymentInfo.id.toString();
            existingActive.lastPaymentDate = new Date(paymentInfo.date_approved);
            existingActive.endDate = newEndDate;
            existingActive.paymentHistory.push({
                date: new Date(paymentInfo.date_approved),
                amount: paymentInfo.transaction_amount || paymentInfo.amount,
                status: 'success',
                paymentId: paymentInfo.id.toString(),
            });
            await existingActive.save();

            await Restaurant.findByIdAndUpdate(restaurantId, {
                subscriptionEndDate: newEndDate,
                lastPaymentDate: new Date(paymentInfo.date_approved),
            });

            return res.status(200).json({
                success: true,
                message: 'Pago verificado y suscripción extendida',
                data: {
                    subscription: existingActive,
                    payment: paymentInfo,
                    extended: true,
                },
            });
        }

        // Crear nueva suscripción (primer pago de este restaurante)
        const planConfig = Subscription.schema.statics.getPlanConfig(plan);
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, plan);

        const newSubscription = new Subscription({
            restaurant: restaurantId,
            plan,
            status: 'active',
            startDate,
            endDate,
            amount: paymentInfo.amount,
            currency: paymentInfo.currency,
            paymentProvider: 'mercadopago',
            paymentId: paymentInfo.id,
            lastPaymentDate: new Date(paymentInfo.date_approved),
            autoRenew: false,
            features: planConfig.features,
            paymentHistory: [{
                date: new Date(paymentInfo.date_approved),
                amount: paymentInfo.amount,
                status: 'success',
                paymentId: paymentInfo.id,
            }],
        });

        await newSubscription.save();

        // Actualizar el restaurante
        await Restaurant.findByIdAndUpdate(restaurantId, {
            currentSubscription: newSubscription._id,
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            lastPaymentDate: new Date(paymentInfo.date_approved),
            isSuspended: false,
            suspensionReason: null,
        });

        res.status(200).json({
            success: true,
            message: 'Pago verificado y suscripción activada',
            data: {
                subscription: newSubscription,
                payment: paymentInfo,
            },
        });
    } catch (error) {
        console.error('Error al verificar pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar el pago',
            error: error.message,
        });
    }
};

module.exports = {
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
};
