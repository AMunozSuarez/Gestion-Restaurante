const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        unique: true, // Asegura que sea único
        required: true,
    },
    foods: [{
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true }, // Referencia al modelo "Food"
        quantity: { type: Number, required: true }
    }],
    payment: {
        type: String,
        enum: ['Efectivo', 'Debito', 'Transferencia'],
        default: 'Efectivo',
        required: [true, 'Please select a payment method']
    },
    total: {
        type: Number,
        required: true
    },
    buyer: {
        type: String, // Cambiado a String para almacenar directamente el nombre del cliente
        required: true
    },
    customerPhone: {
        type: String,
    },
    section: {
        type: String,
        enum: ['delivery', 'mostrador'],
        required: true
    },
    status: {
        type: String,
        enum: ['preparing', 'prepare', 'on the way', 'delivered', 'canceled', 'completed'],
        default: 'preparing'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);