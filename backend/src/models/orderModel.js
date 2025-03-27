const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    foods: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'foods'
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    status: {
        type: String,
        enum: ['preparing', 'prepare', 'on the way', 'delivered', 'canceled', 'completed'],
        default: 'preparing'
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('order', orderSchema)