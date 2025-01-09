const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        default: 'https://openclipart.org/image/800px/289282',
        trim: true
    },

}, {
    timestamps: true
})

module.exports = mongoose.model('Category', categorySchema)