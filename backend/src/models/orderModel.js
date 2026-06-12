const mongoose = require('mongoose');

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
            selectedExtras: [{
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
    deletedFoods: [
        {
            food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food' },
            quantity: { type: Number },
            comment: { type: String, default: '' },
            name: { type: String, default: '' },
            selectedExtras: [{
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