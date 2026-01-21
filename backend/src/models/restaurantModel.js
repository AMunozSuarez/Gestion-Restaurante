const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Relación con el usuario propietario
        required: false,
    },
    // Campos de suscripción
    currentSubscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
    },
    subscriptionStatus: {
        type: String,
        enum: ['trial', 'active', 'expired', 'cancelled', 'suspended'],
        default: 'trial',
        index: true,
    },
    subscriptionPlan: {
        type: String,
        enum: ['trial', 'basic', 'premium', 'enterprise'],
        default: 'trial',
    },
    subscriptionStartDate: {
        type: Date,
    },
    subscriptionEndDate: {
        type: Date,
    },
    trialEndDate: {
        type: Date,
    },
    lastPaymentDate: {
        type: Date,
    },
    // Control de acceso
    isActive: {
        type: Boolean,
        default: true,
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    suspensionReason: {
        type: String,
    },
    // Información adicional
    phone: {
        type: String,
    },
    email: {
        type: String,
    },
    taxId: {
        type: String, // RFC, NIT, etc. para facturación
    },
    billingAddress: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);