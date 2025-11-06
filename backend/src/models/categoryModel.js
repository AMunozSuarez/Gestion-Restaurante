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

}, {
    timestamps: true
})

module.exports = mongoose.model('Category', categorySchema)