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
    digitalMenu: {
        enabled: false,
        description: '',
        logoUrl: '',
        bannerUrl: '',
        showLogo: true,
        socialLinks: { instagram: '', facebook: '', whatsapp: '' },
        whatsapp: '',
        schedule: [
            { day: 'lunes', open: '12:00', close: '23:00', closed: false },
            { day: 'martes', open: '12:00', close: '23:00', closed: false },
            { day: 'miercoles', open: '12:00', close: '23:00', closed: false },
            { day: 'jueves', open: '12:00', close: '23:00', closed: false },
            { day: 'viernes', open: '12:00', close: '23:00', closed: false },
            { day: 'sabado', open: '12:00', close: '23:00', closed: false },
            { day: 'domingo', open: '12:00', close: '23:00', closed: false },
        ],
        appearance: { primaryColor: '#d4743f', secondaryColor: '#8b4513', buttonColor: '#d4743f', textColor: '#2d2013' },
        seo: { title: '', description: '' },
    },
});

const VALID_SCHEDULE_DAYS = RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.schedule.map((d) => d.day);

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
        digitalMenu: normalizeDigitalMenuSettings(settings?.digitalMenu),
    };
};

const normalizeDigitalMenuSettings = (digitalMenu = {}) => {
    const defaults = RESTAURANT_SETTINGS_DEFAULTS.digitalMenu;
    const source = digitalMenu && typeof digitalMenu === 'object' ? digitalMenu : {};

    const rawSchedule = Array.isArray(source.schedule) ? source.schedule : [];
    const schedule = defaults.schedule.map((defaultDay) => {
        const match = rawSchedule.find((entry) => entry && entry.day === defaultDay.day) || {};
        return {
            day: defaultDay.day,
            open: typeof match.open === 'string' && match.open.trim() ? match.open.trim() : defaultDay.open,
            close: typeof match.close === 'string' && match.close.trim() ? match.close.trim() : defaultDay.close,
            closed: Boolean(match.closed),
        };
    });

    const socialLinks = source.socialLinks && typeof source.socialLinks === 'object' ? source.socialLinks : {};
    const appearance = source.appearance && typeof source.appearance === 'object' ? source.appearance : {};
    const seo = source.seo && typeof source.seo === 'object' ? source.seo : {};

    return {
        enabled: Boolean(source.enabled),
        description: typeof source.description === 'string' ? source.description.trim() : defaults.description,
        logoUrl: typeof source.logoUrl === 'string' ? source.logoUrl.trim() : defaults.logoUrl,
        bannerUrl: typeof source.bannerUrl === 'string' ? source.bannerUrl.trim() : defaults.bannerUrl,
        showLogo: source.showLogo === undefined ? defaults.showLogo : Boolean(source.showLogo),
        socialLinks: {
            instagram: typeof socialLinks.instagram === 'string' ? socialLinks.instagram.trim() : defaults.socialLinks.instagram,
            facebook: typeof socialLinks.facebook === 'string' ? socialLinks.facebook.trim() : defaults.socialLinks.facebook,
            whatsapp: typeof socialLinks.whatsapp === 'string' ? socialLinks.whatsapp.trim() : defaults.socialLinks.whatsapp,
        },
        whatsapp: typeof source.whatsapp === 'string' ? source.whatsapp.trim() : defaults.whatsapp,
        schedule,
        appearance: {
            primaryColor: typeof appearance.primaryColor === 'string' ? appearance.primaryColor.trim() : defaults.appearance.primaryColor,
            secondaryColor: typeof appearance.secondaryColor === 'string' ? appearance.secondaryColor.trim() : defaults.appearance.secondaryColor,
            buttonColor: typeof appearance.buttonColor === 'string' ? appearance.buttonColor.trim() : defaults.appearance.buttonColor,
            textColor: typeof appearance.textColor === 'string' ? appearance.textColor.trim() : defaults.appearance.textColor,
        },
        seo: {
            title: typeof seo.title === 'string' ? seo.title.trim() : defaults.seo.title,
            description: typeof seo.description === 'string' ? seo.description.trim() : defaults.seo.description,
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
    publicMenuSlug: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true,
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
        digitalMenu: {
            enabled: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.enabled,
            },
            description: {
                type: String,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.description,
            },
            logoUrl: {
                type: String,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.logoUrl,
            },
            bannerUrl: {
                type: String,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.bannerUrl,
            },
            showLogo: {
                type: Boolean,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.showLogo,
            },
            socialLinks: {
                instagram: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.socialLinks.instagram,
                },
                facebook: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.socialLinks.facebook,
                },
                whatsapp: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.socialLinks.whatsapp,
                },
            },
            whatsapp: {
                type: String,
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.whatsapp,
            },
            schedule: {
                type: [{
                    day: { type: String, enum: VALID_SCHEDULE_DAYS },
                    open: { type: String },
                    close: { type: String },
                    closed: { type: Boolean, default: false },
                }],
                default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.schedule,
            },
            appearance: {
                primaryColor: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.appearance.primaryColor,
                },
                secondaryColor: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.appearance.secondaryColor,
                },
                buttonColor: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.appearance.buttonColor,
                },
                textColor: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.appearance.textColor,
                },
            },
            seo: {
                title: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.seo.title,
                },
                description: {
                    type: String,
                    default: RESTAURANT_SETTINGS_DEFAULTS.digitalMenu.seo.description,
                },
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