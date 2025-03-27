const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    foods: [{
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'foods', required: true },
        quantity: { type: Number, required: true } // Cantidad de este alimento en la orden
    }],
    payment: {
        type: String,
        enum: ['cash', 'debit', 'transfer'],
        default: 'cash',
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
        required: true
    },
    status: {
        type: String,
        enum: ['preparing', 'prepare', 'on the way', 'delivered', 'canceled', 'completed'],
        default: 'preparing'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('order', orderSchema);