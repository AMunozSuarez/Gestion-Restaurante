const mongoose = require('mongoose');

const RESTAURANT_SETTINGS_DEFAULTS = Object.freeze({
    printing: {
        updatePrintMode: 'all',
        reprintTicketOnCloseTable: false,
        printOnDeletedItemsUpdate: false,
        avoidDuplicateKitchenUpdatePrint: false,
    },
    permissions: {
        onlyOwnerCanCloseTable: false,
    },
});

const normalizeRestaurantSettings = (settings = {}) => ({
    printing: {
        updatePrintMode: settings?.printing?.updatePrintMode === 'new-only' ? 'new-only' : RESTAURANT_SETTINGS_DEFAULTS.printing.updatePrintMode,
        reprintTicketOnCloseTable: Boolean(settings?.printing?.reprintTicketOnCloseTable),
        printOnDeletedItemsUpdate: Boolean(settings?.printing?.printOnDeletedItemsUpdate),
        avoidDuplicateKitchenUpdatePrint: Boolean(settings?.printing?.avoidDuplicateKitchenUpdatePrint),
    },
    permissions: {
        onlyOwnerCanCloseTable: Boolean(settings?.permissions?.onlyOwnerCanCloseTable),
    },
});

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
    settings: {
        printing: {
            updatePrintMode: {
                type: String,
                enum: ['all', 'new-only'],
                default: RESTAURANT_SETTINGS_DEFAULTS.printing.updatePrintMode,
            },
            reprintTicketOnCloseTable: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.printing.reprintTicketOnCloseTable,
            },
            printOnDeletedItemsUpdate: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.printing.printOnDeletedItemsUpdate,
            },
            avoidDuplicateKitchenUpdatePrint: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.printing.avoidDuplicateKitchenUpdatePrint,
            },
        },
        permissions: {
            onlyOwnerCanCloseTable: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.permissions.onlyOwnerCanCloseTable,
            },
        },
    },
}, { timestamps: true });

restaurantSchema.statics.normalizeSettings = function (settings = {}) {
    return normalizeRestaurantSettings(settings);
};

restaurantSchema.statics.getDefaultSettings = function () {
    return normalizeRestaurantSettings({});
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
module.exports.RESTAURANT_SETTINGS_DEFAULTS = RESTAURANT_SETTINGS_DEFAULTS;
module.exports.normalizeRestaurantSettings = normalizeRestaurantSettings;