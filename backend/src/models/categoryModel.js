const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    printDestinations: {
        type: [String],
        enum: ['cocina', 'barra', 'caja'],
        default: [],
    },
    order: {
        type: Number,
        default: 0,
    },

}, {
    timestamps: true
})

module.exports = mongoose.model('Category', categorySchema)