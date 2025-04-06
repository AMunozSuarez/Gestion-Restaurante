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



}, {
    timestamps: true
})

module.exports = mongoose.model('Food', foodSchema)