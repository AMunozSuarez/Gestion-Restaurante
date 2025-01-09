const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Please enter the restaurant title'],
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    foods: {
        type: Array,
        default: []
    },
    time: {
        type: String,
    },
    pickup: {
        type: Boolean,
        default: true
    },
    delivery: {
        type: Boolean,
        default: true
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    logoUrl: {
        type: String,
        trim: true
    },
    rating: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    ratingCount: {
        type: String,
    },
    code: {
        type: String,
    },
    coords: {
        id:{type: String},
        lat: {type: Number},
        lng: {type: Number},
        address: {type: String},
        title: {type: String},
    }


}, {
    timestamps: true
})

module.exports = mongoose.model('Restaurant', restaurantSchema)