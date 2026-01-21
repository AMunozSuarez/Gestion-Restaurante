const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');

/**
 * Middleware principal para verificar que el restaurante tenga una suscripción activa
 * Se aplica a todas las rutas que requieren una suscripción válida
 */
const checkSubscription = async (req, res, next) => {
    try {
        // Si es super_admin, permitir acceso sin restricciones
        if (req.user && req.user.role === 'super_admin') {
            return next();
        }

        // Obtener el restaurante del usuario
        const restaurantId = req.user?.restaurant;
        
        if (!restaurantId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes un restaurante asociado',
                code: 'NO_RESTAURANT',
            });
        }

        // Buscar el restaurante con su suscripción
        const restaurant = await Restaurant.findById(restaurantId)
            .populate('currentSubscription');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado',
                code: 'RESTAURANT_NOT_FOUND',
            });
        }

        // Verificar si el restaurante está suspendido
        if (restaurant.isSuspended) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta ha sido suspendida. Contacta a soporte.',
                code: 'ACCOUNT_SUSPENDED',
                reason: restaurant.suspensionReason,
            });
        }

        // Si no tiene suscripción, buscar o crear una
        let subscription = restaurant.currentSubscription;
        
        if (!subscription) {
            // Buscar la suscripción más reciente
            subscription = await Subscription.findOne({ 
                restaurant: restaurantId 
            }).sort({ createdAt: -1 });

            // Si no existe ninguna suscripción, crear una de prueba
            if (!subscription) {
                subscription = await createTrialSubscription(restaurantId);
                restaurant.currentSubscription = subscription._id;
                restaurant.subscriptionStatus = 'trial';
                restaurant.subscriptionPlan = 'trial';
                restaurant.subscriptionStartDate = subscription.startDate;
                restaurant.subscriptionEndDate = subscription.endDate;
                restaurant.trialEndDate = subscription.endDate;
                await restaurant.save();
            }
        }

        // Verificar si puede acceder (activa o en período de gracia)
        const canAccess = subscription.canAccess();

        if (!canAccess) {
            // Suscripción expirada sin período de gracia
            return res.status(402).json({
                success: false,
                message: 'Tu suscripción ha expirado',
                code: 'SUBSCRIPTION_EXPIRED',
                data: {
                    plan: subscription.plan,
                    endDate: subscription.endDate,
                    daysExpired: Math.abs(subscription.getDaysRemaining()),
                },
            });
        }

        // Si está en período de gracia, agregar advertencia
        if (subscription.isInGracePeriod()) {
            res.locals.warning = {
                message: 'Tu suscripción está en período de gracia',
                gracePeriodEnd: subscription.gracePeriodEnd,
                daysRemaining: Math.ceil(
                    (subscription.gracePeriodEnd - new Date()) / (1000 * 60 * 60 * 24)
                ),
            };
        }

        // Agregar información de suscripción a la request
        req.subscription = subscription;
        req.restaurant = restaurant;

        next();
    } catch (error) {
        console.error('Error en checkSubscription:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar la suscripción',
            error: error.message,
        });
    }
};

/**
 * Middleware para verificar características específicas del plan
 */
const checkPlanFeature = (feature) => {
    return async (req, res, next) => {
        try {
            const subscription = req.subscription;

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No se pudo verificar tu suscripción',
                    code: 'NO_SUBSCRIPTION',
                });
            }

            // Verificar si el plan tiene acceso a la característica
            const hasFeature = subscription.features[feature];

            if (!hasFeature) {
                return res.status(403).json({
                    success: false,
                    message: `Esta función requiere un plan superior`,
                    code: 'FEATURE_NOT_AVAILABLE',
                    feature,
                    currentPlan: subscription.plan,
                    requiredUpgrade: true,
                });
            }

            next();
        } catch (error) {
            console.error('Error en checkPlanFeature:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar características del plan',
                error: error.message,
            });
        }
    };
};

/**
 * Middleware para verificar límites del plan (ej: máximo de pedidos)
 */
const checkPlanLimit = (limitType) => {
    return async (req, res, next) => {
        try {
            const subscription = req.subscription;
            
            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No se pudo verificar tu suscripción',
                });
            }

            const limit = subscription.features[limitType];

            // Si el límite es -1, es ilimitado
            if (limit === -1) {
                return next();
            }

            // Aquí deberías implementar la lógica para contar el uso actual
            // Por ejemplo, contar pedidos del día, empleados activos, etc.
            // Este es un placeholder que debes adaptar según tu lógica

            req.planLimit = {
                type: limitType,
                limit,
                current: 0, // Implementar conteo real
            };

            next();
        } catch (error) {
            console.error('Error en checkPlanLimit:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar límites del plan',
                error: error.message,
            });
        }
    };
};

/**
 * Middleware para rutas que permiten acceso de solo lectura con suscripción expirada
 */
const allowReadOnlyExpired = async (req, res, next) => {
    try {
        // Si es GET y la suscripción está expirada, permitir acceso
        if (req.method === 'GET') {
            return next();
        }

        // Para otros métodos, verificar suscripción normalmente
        return checkSubscription(req, res, next);
    } catch (error) {
        console.error('Error en allowReadOnlyExpired:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar permisos',
            error: error.message,
        });
    }
};

/**
 * Función helper para crear una suscripción de prueba
 */
const createTrialSubscription = async (restaurantId) => {
    const planConfig = Subscription.schema.statics.getPlanConfig('trial');
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planConfig.duration);

    const subscription = new Subscription({
        restaurant: restaurantId,
        plan: 'trial',
        status: 'active',
        startDate,
        endDate,
        trialEndDate: endDate,
        amount: 0,
        currency: 'USD',
        features: planConfig.features,
        autoRenew: false,
    });

    await subscription.save();
    return subscription;
};

module.exports = {
    checkSubscription,
    checkPlanFeature,
    checkPlanLimit,
    allowReadOnlyExpired,
};
