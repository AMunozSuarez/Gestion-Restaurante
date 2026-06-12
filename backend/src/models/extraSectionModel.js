const mongoose = require('mongoose');

const extraSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        default: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    recipe: [{
        ingredient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
    }],
}, { _id: true });

const extraSectionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    sectionName: {
        type: String,
        required: [true, 'El nombre de la sección es requerido'],
        trim: true
    },
    extras: [extraSchema]
}, { timestamps: true });

extraSectionSchema.index({ restaurant: 1 });

module.exports = mongoose.model('ExtraSection', extraSectionSchema);
