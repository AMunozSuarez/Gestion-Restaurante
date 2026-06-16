const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Please enter the food title'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Please enter the food price']
    },
    imageUrl: {
        type: String,
        default: 'https://openclipart.org/image/800px/289282',
        trim: true
    },
    foodTags: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Please select a category']
    },
    code: {
        type: String,
        trim: true
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    extraSections: [{
        section: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExtraSection',
            required: true
        },
        // null = ilimitado; número = máximo de extras seleccionables de esta sección
        maxSelection: {
            type: Number,
            default: null
        },
        // IDs vacío = mostrar todos los extras de la sección; con IDs = solo esos extras
        visibleExtraIds: [{
            type: mongoose.Schema.Types.ObjectId
        }]
    }],
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
    recipeEnabled: {
        type: Boolean,
        default: true,
    },

}, {
    timestamps: true
});

// Índice compuesto para validar alimentos por restaurante
foodSchema.index({ restaurant: 1, _id: 1 });

module.exports = mongoose.model('Food', foodSchema);