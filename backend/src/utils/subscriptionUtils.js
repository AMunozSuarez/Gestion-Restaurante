const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');

/**
 * Calcula la fecha de fin de una suscripción basada en el plan
 * @param {Date} startDate - Fecha de inicio
 * @param {String} plan - Nombre del plan (trial, basic, premium, enterprise)
 * @returns {Date} Fecha de fin
 */
const calculateEndDate = (startDate, plan) => {
    const config = Subscription.schema.statics.getPlanConfig(plan);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + config.duration);
    return endDate;
};

/**
 * Calcula la fecha de próxima facturación
 * @param {Date} currentEndDate - Fecha de fin actual
 * @returns {Date} Fecha de próxima facturación
 */
const calculateNextBillingDate = (currentEndDate) => {
    const nextBilling = new Date(currentEndDate);
    nextBilling.setDate(nextBilling.getDate() + 30); // Asumiendo ciclo mensual
    return nextBilling;
};

/**
 * Verifica si una suscripción necesita enviar recordatorio de expiración
 * @param {Object} subscription - Documento de suscripción
 * @returns {Object} { shouldNotify: Boolean, daysRemaining: Number }
 */
const checkExpirationReminder = (subscription) => {
    const now = new Date();
    const daysRemaining = subscription.getDaysRemaining();
    
    // Enviar recordatorio a 7, 3 y 1 día antes de expirar
    const reminderDays = [7, 3, 1];
    const shouldNotify = reminderDays.includes(daysRemaining);
    
    // Verificar si ya se envió el recordatorio para este día
    const alreadySent = subscription.notificationsSent.some(notif => {
        const notifDate = new Date(notif.date);
        const isSameDay = notifDate.toDateString() === now.toDateString();
        return isSameDay && notif.type === 'expiration_reminder';
    });

    return {
        shouldNotify: shouldNotify && !alreadySent,
        daysRemaining,
    };
};

/**
 * Obtiene todas las suscripciones que expiran hoy
 * @returns {Promise<Array>} Array de suscripciones
 */
const getExpiringSoon = async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await Subscription.find({
        status: { $in: ['active', 'trial'] },
        endDate: { $lte: tomorrow },
        autoRenew: false,
    }).populate('restaurant');
};

/**
 * Obtiene suscripciones que necesitan renovación automática
 * @returns {Promise<Array>} Array de suscripciones para renovar
 */
const getSubscriptionsForRenewal = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await Subscription.find({
        status: 'active',
        autoRenew: true,
        endDate: { $gte: today, $lt: tomorrow },
    }).populate('restaurant');
};

/**
 * Actualiza el estado de una suscripción a expirada
 */
const expireSubscription = async (subscriptionId) => {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.status = 'expired';
    await subscription.save();

    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionStatus: 'expired',
    });

    return subscription;
};

/**
 * Suspende una suscripción (después del período de gracia)
 * @param {String} subscriptionId - ID de la suscripción
 * @param {String} reason - Razón de la suspensión
 * @returns {Promise<Object>} Suscripción actualizada
 */
const suspendSubscription = async (subscriptionId, reason = 'Pago no recibido') => {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.status = 'suspended';
    await subscription.save();

    // Actualizar también el restaurante
    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionStatus: 'suspended',
        isSuspended: true,
        suspensionReason: reason,
    });

    return subscription;
};

/**
 * Renueva una suscripción (crea una nueva a partir de la anterior)
 * @param {String} subscriptionId - ID de la suscripción a renovar
 * @param {Object} paymentData - Datos del pago realizado
 * @returns {Promise<Object>} Nueva suscripción creada
 */
const renewSubscription = async (subscriptionId, paymentData = {}) => {
    const oldSubscription = await Subscription.findById(subscriptionId);
    
    if (!oldSubscription) {
        throw new Error('Suscripción no encontrada');
    }

    // Marcar la antigua como cancelada
    oldSubscription.status = 'cancelled';
    await oldSubscription.save();

    // Crear nueva suscripción
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, oldSubscription.plan);
    const planConfig = Subscription.schema.statics.getPlanConfig(oldSubscription.plan);

    const newSubscription = new Subscription({
        restaurant: oldSubscription.restaurant,
        plan: oldSubscription.plan,
        status: 'active',
        startDate,
        endDate,
        amount: paymentData.amount || planConfig.price,
        currency: paymentData.currency || oldSubscription.currency,
        paymentProvider: paymentData.provider || oldSubscription.paymentProvider,
        paymentId: paymentData.paymentId,
        subscriptionId: paymentData.subscriptionId || oldSubscription.subscriptionId,
        lastPaymentDate: new Date(),
        nextBillingDate: calculateNextBillingDate(endDate),
        autoRenew: oldSubscription.autoRenew,
        features: oldSubscription.features,
        paymentHistory: [{
            date: new Date(),
            amount: paymentData.amount || planConfig.price,
            status: 'success',
            paymentId: paymentData.paymentId,
            invoiceUrl: paymentData.invoiceUrl,
        }],
    });

    await newSubscription.save();

    // Actualizar restaurante
    await Restaurant.findByIdAndUpdate(oldSubscription.restaurant, {
        currentSubscription: newSubscription._id,
        subscriptionStatus: 'active',
        subscriptionPlan: newSubscription.plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        lastPaymentDate: new Date(),
        isSuspended: false,
        suspensionReason: null,
    });

    return newSubscription;
};

/**
 * Cancela una suscripción
 * @param {String} subscriptionId - ID de la suscripción
 * @param {String} reason - Razón de cancelación
 * @returns {Promise<Object>} Suscripción cancelada
 */
const cancelSubscription = async (subscriptionId, reason = '') => {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason;
    subscription.autoRenew = false;
    await subscription.save();

    // Actualizar restaurante
    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionStatus: 'cancelled',
    });

    return subscription;
};

/**
 * Cambia el plan de una suscripción
 * @param {String} subscriptionId - ID de la suscripción
 * @param {String} newPlan - Nuevo plan (basic, premium, enterprise)
 * @returns {Promise<Object>} Suscripción actualizada
 */
const changePlan = async (subscriptionId, newPlan) => {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    const planConfig = Subscription.schema.statics.getPlanConfig(newPlan);
    
    subscription.plan = newPlan;
    subscription.features = planConfig.features;
    await subscription.save();

    // Actualizar restaurante
    await Restaurant.findByIdAndUpdate(subscription.restaurant, {
        subscriptionPlan: newPlan,
    });

    return subscription;
};

/**
 * Registra un pago en el historial
 * @param {String} subscriptionId - ID de la suscripción
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} Suscripción actualizada
 */
const recordPayment = async (subscriptionId, paymentData) => {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.paymentHistory.push({
        date: new Date(),
        amount: paymentData.amount,
        status: paymentData.status || 'success',
        paymentId: paymentData.paymentId,
        invoiceUrl: paymentData.invoiceUrl,
    });

    if (paymentData.status === 'success') {
        subscription.lastPaymentDate = new Date();
    }

    await subscription.save();
    return subscription;
};

/**
 * Registra una notificación enviada
 * @param {String} subscriptionId - ID de la suscripción
 * @param {String} type - Tipo de notificación
 * @param {String} channel - Canal (email, sms, push)
 * @returns {Promise<Object>} Suscripción actualizada
 */
const recordNotification = async (subscriptionId, type, channel = 'email') => {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.notificationsSent.push({
        type,
        date: new Date(),
        channel,
    });

    await subscription.save();
    return subscription;
};

/**
 * Obtiene estadísticas de suscripciones
 * @returns {Promise<Object>} Objeto con estadísticas
 */
const getSubscriptionStats = async () => {
    const totalActive = await Subscription.countDocuments({ 
        status: { $in: ['active', 'trial'] } 
    });
    
    const totalExpired = await Subscription.countDocuments({ status: 'expired' });
    const totalCancelled = await Subscription.countDocuments({ status: 'cancelled' });
    const totalSuspended = await Subscription.countDocuments({ status: 'suspended' });

    const planDistribution = await Subscription.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const totalRevenue = await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
        total: totalActive + totalExpired + totalCancelled + totalSuspended,
        active: totalActive,
        expired: totalExpired,
        cancelled: totalCancelled,
        suspended: totalSuspended,
        planDistribution,
        monthlyRevenue: totalRevenue[0]?.total || 0,
    };
};

module.exports = {
    // Funciones de cálculo de fechas
    calculateEndDate,
    calculateNextBillingDate,

    // Funciones de consulta
    checkExpirationReminder,
    getExpiringSoon,
    getSubscriptionsForRenewal,
    getSubscriptionStats,
    
    // Funciones de gestión de suscripciones
    expireSubscription,
    suspendSubscription,
    renewSubscription,
    cancelSubscription,
    changePlan,
    
    // Funciones de registro
    recordPayment,
    recordNotification,
};
