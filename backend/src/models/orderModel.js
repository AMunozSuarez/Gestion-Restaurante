const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        required: true,
    },
    foods: [{
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
        quantity: { type: Number, required: true },
        comment: { type: String, default: '' } // Nuevo campo para comentarios
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
        type: String,
    },
    customerPhone: {
        type: String,
    },
    deliveryAddress: {
        type: String,
        validate: {
            validator: function () {
                // Solo es requerido si la sección es "delivery"
                return this.section !== 'delivery' || (this.deliveryAddress && this.deliveryAddress.trim().length > 0);
            },
            message: 'La dirección de entrega es obligatoria para pedidos de delivery.'
        }
    },
    section: {
        type: String,
        enum: ['delivery', 'mostrador'],
        required: true
    },
    status: {
        type: String,
        enum: ['Preparacion', 'En camino', 'delivered', 'Cancelado', 'Completado'],
        default: 'Preparacion'
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);