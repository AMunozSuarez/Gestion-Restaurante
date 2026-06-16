const mongoose = require('mongoose');

const MOVEMENT_TYPES = ['entrada_compra', 'salida_venta', 'ajuste_positivo', 'ajuste_negativo'];

const inventoryMovementSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
    },
    type: {
        type: String,
        enum: MOVEMENT_TYPES,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    reference: {
        type: String,
        trim: true,
        default: '',
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, { timestamps: true });

inventoryMovementSchema.index({ restaurant: 1, createdAt: -1 });
inventoryMovementSchema.index({ item: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;
