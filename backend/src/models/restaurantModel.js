const mongoose = require('mongoose');

const VALID_PRINT_ROLES = ['cocina', 'barra', 'caja'];

const RESTAURANT_SETTINGS_DEFAULTS = Object.freeze({
    printing: {
        updatePrintMode: 'all',
        reprintTicketOnCloseTable: false,
        printOnDeletedItemsUpdate: false,
        avoidDuplicateKitchenUpdatePrint: false,
        extraSectionPrintDestinations: {},
    },
    permissions: {
        onlyOwnerCanCloseTable: false,
        onlyOwnerCanDeleteOrderItems: false,
    },
    inventory: {
        enabled: false,
    },
    kitchenDisplay: {
        enabled: false,
        requireReadyToClose: false,
        requireAllItemsReady: false,
        onlyOwnerCanMarkReady: false,
    },
    selfService: {
        enabled: false,
        requireCustomerName: true,
        allowOrderComment: false,
        printCustomerTicket: true,
        // Pago remoto con POS Haulmer/TUU. Lo activa solo el super_admin. La API Key NO vive
        // aquí (settings se expone en rutas públicas): está cifrada en paymentIntegrations.
        remotePayment: {
            enabled: false,
            allowPayAtCounter: false,
            dteType: 48,
        },
    },
});

const VALID_DTE_TYPES = [0, 33, 48, 99];

const normalizeRestaurantSettings = (settings = {}) => {
    const rawExtraSectionDestinations = settings?.printing?.extraSectionPrintDestinations;
    const sourceExtraSectionDestinations =
        rawExtraSectionDestinations instanceof Map
            ? Object.fromEntries(rawExtraSectionDestinations.entries())
            : (rawExtraSectionDestinations && typeof rawExtraSectionDestinations === 'object'
                ? rawExtraSectionDestinations
                : RESTAURANT_SETTINGS_DEFAULTS.printing.extraSectionPrintDestinations);

    const extraSectionPrintDestinations = {};
    Object.entries(sourceExtraSectionDestinations || {}).forEach(([rawSectionName, rawRoles]) => {
        if (typeof rawSectionName !== 'string') {
            return;
        }

        const sectionName = rawSectionName.trim();
        if (!sectionName || !Array.isArray(rawRoles)) {
            return;
        }

        const dedupedRoles = [];
        rawRoles.forEach((role) => {
            if (typeof role === 'string' && VALID_PRINT_ROLES.includes(role) && !dedupedRoles.includes(role)) {
                dedupedRoles.push(role);
            }
        });

        extraSectionPrintDestinations[sectionName] = dedupedRoles;
    });

    return {
        printing: {
            updatePrintMode: settings?.printing?.updatePrintMode === 'new-only' ? 'new-only' : RESTAURANT_SETTINGS_DEFAULTS.printing.updatePrintMode,
            reprintTicketOnCloseTable: Boolean(settings?.printing?.reprintTicketOnCloseTable),
            printOnDeletedItemsUpdate: Boolean(settings?.printing?.printOnDeletedItemsUpdate),
            avoidDuplicateKitchenUpdatePrint: Boolean(settings?.printing?.avoidDuplicateKitchenUpdatePrint),
            extraSectionPrintDestinations,
        },
        permissions: {
            onlyOwnerCanCloseTable: Boolean(settings?.permissions?.onlyOwnerCanCloseTable),
            onlyOwnerCanDeleteOrderItems: Boolean(settings?.permissions?.onlyOwnerCanDeleteOrderItems),
        },
        inventory: {
            enabled: Boolean(settings?.inventory?.enabled),
        },
        kitchenDisplay: {
            enabled: Boolean(settings?.kitchenDisplay?.enabled),
            requireReadyToClose: Boolean(settings?.kitchenDisplay?.requireReadyToClose),
            requireAllItemsReady: Boolean(settings?.kitchenDisplay?.requireAllItemsReady),
            onlyOwnerCanMarkReady: Boolean(settings?.kitchenDisplay?.onlyOwnerCanMarkReady),
        },
        selfService: {
            enabled: Boolean(settings?.selfService?.enabled),
            // requireCustomerName y printCustomerTicket son los únicos booleanos con default
            // true del archivo: Boolean(undefined) los forzaría a false en cada normalización,
            // así que se comparan contra false explícitamente.
            requireCustomerName: settings?.selfService?.requireCustomerName !== false,
            allowOrderComment: Boolean(settings?.selfService?.allowOrderComment),
            printCustomerTicket: settings?.selfService?.printCustomerTicket !== false,
            remotePayment: {
                enabled: Boolean(settings?.selfService?.remotePayment?.enabled),
                allowPayAtCounter: Boolean(settings?.selfService?.remotePayment?.allowPayAtCounter),
                dteType: VALID_DTE_TYPES.includes(Number(settings?.selfService?.remotePayment?.dteType))
                    ? Number(settings.selfService.remotePayment.dteType)
                    : RESTAURANT_SETTINGS_DEFAULTS.selfService.remotePayment.dteType,
            },
        },
    };
};

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
            extraSectionPrintDestinations: {
                type: mongoose.Schema.Types.Mixed,
                default: RESTAURANT_SETTINGS_DEFAULTS.printing.extraSectionPrintDestinations,
            },
        },
        permissions: {
            onlyOwnerCanCloseTable: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.permissions.onlyOwnerCanCloseTable,
            },
            onlyOwnerCanDeleteOrderItems: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.permissions.onlyOwnerCanDeleteOrderItems,
            },
        },
        inventory: {
            enabled: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.inventory.enabled,
            },
        },
        kitchenDisplay: {
            enabled: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.kitchenDisplay.enabled,
            },
            requireReadyToClose: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.kitchenDisplay.requireReadyToClose,
            },
            requireAllItemsReady: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.kitchenDisplay.requireAllItemsReady,
            },
            onlyOwnerCanMarkReady: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.kitchenDisplay.onlyOwnerCanMarkReady,
            },
        },
        selfService: {
            enabled: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.selfService.enabled,
            },
            requireCustomerName: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.selfService.requireCustomerName,
            },
            allowOrderComment: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.selfService.allowOrderComment,
            },
            printCustomerTicket: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.selfService.printCustomerTicket,
            },
            remotePayment: {
                enabled: {
                    type: Boolean,
                    default: RESTAURANT_SETTINGS_DEFAULTS.selfService.remotePayment.enabled,
                },
                allowPayAtCounter: {
                    type: Boolean,
                    default: RESTAURANT_SETTINGS_DEFAULTS.selfService.remotePayment.allowPayAtCounter,
                },
                dteType: {
                    type: Number,
                    enum: VALID_DTE_TYPES,
                    default: RESTAURANT_SETTINGS_DEFAULTS.selfService.remotePayment.dteType,
                },
            },
        },
    },
    // Credenciales de integraciones de pago. apiKeyEncrypted tiene select:false para que
    // nunca salga en GET /api/restaurant/get/:id (pública) ni en GET /admin/restaurants:
    // quien la necesite debe pedirla explícitamente con .select('+paymentIntegrations...').
    paymentIntegrations: {
        haulmer: {
            apiKeyEncrypted: { type: String, select: false },
            apiKeyLast4: { type: String, default: '' },
            updatedAt: { type: Date },
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
module.exports.VALID_DTE_TYPES = VALID_DTE_TYPES;