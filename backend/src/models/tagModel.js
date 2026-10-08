const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },
    color: {
        type: String,
        default: '#0d9488',
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },

}, {
    timestamps: true
})

tagSchema.index({ name: 1, restaurant: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

module.exports = mongoose.model('Tag', tagSchema)
