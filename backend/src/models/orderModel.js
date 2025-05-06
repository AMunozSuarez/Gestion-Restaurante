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
        enum: ['Efectivo', 'Debito', 'Transferencia'],
        default: 'Efectivo',
        required: [true, 'Please select a payment method'],
    },
    total: {
        type: Number,
        required: true,
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
    section: {
        type: String,
        enum: ['delivery', 'mostrador'],
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



    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);