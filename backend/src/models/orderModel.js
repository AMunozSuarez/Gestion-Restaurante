const mongoose = require('mongoose');

// sectionId/extraId son opcionales: pedidos creados antes de este campo (o por un
// cliente que aún no lo envía) siguen guardando solo sectionName/extraName. Todo el
// código que lee selectedExtras debe matchear por id cuando exista y caer a nombre
// si no, para no romperse cuando alguien renombra una ExtraSection/Extra ya usada
// en un pedido en curso.
const selectedExtraIdFields = {
    sectionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    extraId: { type: mongoose.Schema.Types.ObjectId, default: null },
};

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        required: true,
    },
    foods: [
        {
            food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
            quantity: { type: Number, required: true },
            comment: { type: String, default: '' },
            ready: { type: Boolean, default: false },
            // Cuándo se agregó este producto al pedido (ver mergeFoodsReadyState en el
            // controller): permite distinguir en el KDS los productos nuevos de los que
            // ya estaban listos, incluso después de marcar el nuevo como "ready" también.
            addedAt: { type: Date, default: Date.now },
            selectedExtras: [{
                ...selectedExtraIdFields,
                sectionName: { type: String, required: true },
                extraName: { type: String, required: true },
                price: { type: Number, default: 0 }
            }]
        },
    ],
    payment: {
        type: String,
        enum: ['Efectivo', 'Debito', 'Transferencia', 'Múltiple', 'Pendiente', ''],
        default: 'Pendiente',
        required: false,
    },
    paymentMethods: [{
        method: {
            type: String,
            enum: ['Efectivo', 'Debito', 'Transferencia'],
            required: false
        },
        amount: {
            type: Number,
            min: 0,
            required: false
        }
    }],
    splitMeta: {
        enabled: { type: Boolean, default: false },
        count: { type: Number, default: 0 },
    },
    splitAccounts: [
        {
            label: { type: String, default: '' },
            subtotal: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
            tip: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            paymentMethods: [{
                method: {
                    type: String,
                    enum: ['Efectivo', 'Debito', 'Transferencia'],
                    required: false
                },
                amount: {
                    type: Number,
                    min: 0,
                    required: false
                }
            }],
            items: [
                {
                    cartId: { type: String, default: '' },
                    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
                    name: { type: String, default: '' },
                    quantity: { type: Number, default: 0 },
                    unitPrice: { type: Number, default: 0 },
                    selectedExtras: [{
                        ...selectedExtraIdFields,
                        sectionName: { type: String, default: '' },
                        extraName: { type: String, default: '' },
                        price: { type: Number, default: 0 }
                    }]
                }
            ]
        }
    ],
    total: {
        type: Number,
        required: true,
    },
    deliveryCost: {
        type: Number,
        default: 0,
    },
    name: {
        type: String,
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer', // Referencia al modelo de clientes
    },
    selectedAddress: {
        type: String, // Almacena la dirección seleccionada del cliente
    },
    tableNumber: {
        type: Number, // Número de mesa (para pedidos de sección "mesas")
    },
    waiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Mesero asignado a la orden
    },
    tip: {
        type: Number,
        default: 0, // Propina
    },
    discount: {
        type: Number,
        default: 0, // Descuento aplicado
    },
    section: {
        type: String,
        enum: ['delivery', 'mostrador', 'mesas'],
        required: true,
    },
    status: {
        type: String,
        enum: ['Preparacion', 'En camino', 'Enviado', 'Cancelado', 'Completado'],
        default: 'Preparacion',
    },
    comment: {
        type: String,
        default: '',
    },
    kitchenReadyAt: {
        type: Date,
        default: null,
    },
    // Se actualiza cuando se agregan productos a una orden que ya estaba lista,
    // para que la pantalla de cocina reinicie el tiempo transcurrido y la
    // muestre como recién ingresada en lugar de conservar el tiempo original.
    kitchenActivityAt: {
        type: Date,
        default: null,
    },
    deletedFoods: [
        {
            food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
            quantity: { type: Number },
            comment: { type: String, default: '' },
            name: { type: String, default: '' },
            selectedExtras: [{
                ...selectedExtraIdFields,
                sectionName: { type: String },
                extraName: { type: String },
                price: { type: Number, default: 0 }
            }]
        },
    ],
    hasDeletedItems: {
        type: Boolean,
        default: false,
    },
    cashRegister: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashRegister',
        required: false, // No requerido para compatibilidad con órdenes antiguas
    },
    inventoryDeducted: {
        type: Boolean,
        default: false,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, { timestamps: true });

// ── Índices compuestos para queries frecuentes ──
orderSchema.index({ restaurant: 1, cashRegister: 1, status: 1 }); // getAllOrders, getFilteredOrders
orderSchema.index({ cashRegister: 1, orderNumber: -1 });           // Obtener último número de orden
orderSchema.index({ restaurant: 1, status: 1, section: 1 });       // Filtros por status/section
orderSchema.index({ restaurant: 1, createdAt: -1 });               // getAllSales ordenado por fecha
orderSchema.index({ restaurant: 1, tip: 1, status: 1 });           // getTipsController

module.exports = mongoose.model('Order', orderSchema);