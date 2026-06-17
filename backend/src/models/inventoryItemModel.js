const mongoose = require('mongoose');

const INVENTORY_UNITS = ['unidad', 'gramos', 'kilogramos', 'litros', 'mililitros', 'porciones'];

const inventoryItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del insumo es requerido'],
        trim: true,
    },
    unit: {
        type: String,
        enum: INVENTORY_UNITS,
        required: [true, 'La unidad de medida es requerida'],
    },
    currentStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    minStock: {
        type: Number,
        default: null,
        min: 0,
    },
    unitCost: {
        type: Number,
        default: null,
        min: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, { timestamps: true });

inventoryItemSchema.index({ restaurant: 1, isActive: 1 });
inventoryItemSchema.index({ restaurant: 1, name: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
module.exports.INVENTORY_UNITS = INVENTORY_UNITS;
