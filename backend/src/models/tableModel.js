const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    tableNumber: {
        type: Number,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        default: 4,
    },
    currentGuests: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'inactive'],
        default: 'available',
    },
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
    },
    section: {
        type: String,
        default: 'Salón',
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
    waiter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    openedAt: {
        type: Date,
        default: null,
    },
    mergedGroup: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
        default: [],
    },
    mergedInto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        default: null,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, {
    timestamps: true,
});

// Índice compuesto para evitar números de mesa duplicados en el mismo restaurante
tableSchema.index({ tableNumber: 1, restaurant: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
