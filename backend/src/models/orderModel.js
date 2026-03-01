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
    cashRegister: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashRegister',
        required: false, // No requerido para compatibilidad con órdenes antiguas
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