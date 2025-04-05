const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Relación con el usuario propietario
        required: true,
    },
    subscriptionPlan: {
        type: String,
        enum: ['Basic', 'Premium', 'Enterprise'], // Planes de suscripción
        default: 'Basic',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);