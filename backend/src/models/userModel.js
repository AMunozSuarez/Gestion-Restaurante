const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, 'Please enter your username'],
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please enter your email'],
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true, // Cada usuario debe estar vinculado a un restaurante
    },
    role: {
        type: String,
        enum: ['owner', 'employee'], // Roles posibles
        default: 'employee',
    },
    phone: {
        type: String,
        default: '',
    },
    avatar: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', userSchema);