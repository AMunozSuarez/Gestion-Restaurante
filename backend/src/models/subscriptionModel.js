const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true,
    },
    plan: {
        type: String,
        enum: ['trial', 'monthly', 'quarterly', 'yearly'],
        required: true,
        default: 'trial',
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'cancelled', 'expired', 'suspended'],
        default: 'pending',
        index: true,
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: true,
    },
    trialEndDate: {
        type: Date,
        // Solo para suscripciones que iniciaron con trial
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
    },
    currency: {
        type: String,
        default: 'CLP',
        enum: ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN'],
    },
    paymentProvider: {
        type: String,
        enum: ['stripe', 'mercadopago', 'paypal', 'manual'],
    },
    paymentId: {
        type: String, // ID de la transacción en la pasarela
    },
    subscriptionId: {
        type: String, // ID de la suscripción en la pasarela (para renovaciones automáticas)
    },
    lastPaymentDate: {
        type: Date,
    },
    nextBillingDate: {
        type: Date,
    },
    autoRenew: {
        type: Boolean,
        default: true,
    },
    cancelledAt: {
        type: Date,
    },
    cancelReason: {
        type: String,
    },
    gracePeriodEnd: {
        type: Date,
        // Fecha hasta la cual el servicio sigue activo después de vencimiento
    },
    // Características del plan
    features: {
        maxLocations: {
            type: Number,
            default: 1,
        },
        advancedReports: {
            type: Boolean,
            default: true,
        },
        apiAccess: {
            type: Boolean,
            default: true,
        },
        prioritySupport: {
            type: Boolean,
            default: true,
        },
    },
    // Histórico de pagos
    paymentHistory: [{
        date: Date,
        amount: Number,
        status: {
            type: String,
            enum: ['success', 'failed', 'refunded'],
        },
        paymentId: String,
        invoiceUrl: String,
    }],
    // Notificaciones enviadas
    notificationsSent: [{
        type: {
            type: String,
            enum: ['expiration_reminder', 'expired', 'payment_failed', 'renewed'],
        },
        date: Date,
        channel: {
            type: String,
            enum: ['email', 'sms', 'push'],
        },
    }],
}, {
    timestamps: true,
});

// Índices compuestos para búsquedas eficientes
subscriptionSchema.index({ restaurant: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, autoRenew: 1 });

// Método para verificar si la suscripción está activa
subscriptionSchema.methods.isActive = function() {
    const now = new Date();
    return (
        (this.status === 'active' || this.status === 'trial') &&
        this.endDate > now
    );
};

// Método para verificar si está en período de gracia
subscriptionSchema.methods.isInGracePeriod = function() {
    const now = new Date();
    return (
        this.status === 'expired' &&
        this.gracePeriodEnd &&
        this.gracePeriodEnd > now
    );
};

// Método para verificar si puede acceder al sistema
subscriptionSchema.methods.canAccess = function() {
    return this.isActive() || this.isInGracePeriod();
};

// Método para obtener días restantes
subscriptionSchema.methods.getDaysRemaining = function() {
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Método estático para obtener configuración de planes
subscriptionSchema.statics.getPlanConfig = function(planName) {
    const plans = {
        trial: {
            name: 'Prueba Gratuita',
            duration: 7, // días
            price: 0,
            features: {
                maxLocations: 1,
                advancedReports: true,
                apiAccess: true,
                prioritySupport: true,
            },
        },
        monthly: {
            name: '1 Mes',
            duration: 30, // días
            price: 20000,
            features: {
                maxLocations: 1,
                advancedReports: true,
                apiAccess: true,
                prioritySupport: true,
            },
        },
        quarterly: {
            name: '3 Meses',
            duration: 90, // días
            price: 50000,
            features: {
                maxLocations: 1,
                advancedReports: true,
                apiAccess: true,
                prioritySupport: true,
            },
        },
        yearly: {
            name: '1 Año',
            duration: 365, // días
            price: 180000,
            features: {
                maxLocations: 1,
                advancedReports: true,
                apiAccess: true,
                prioritySupport: true,
            },
        },
    };
    return plans[planName] || plans.monthly;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
