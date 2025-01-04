const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, 'Please enter your username'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please enter your password']
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    usertype: {
        type: String,
        required: [true, 'Please enter your usertype'],
        default: 'cliente',
        enum: ['cliente', 'admin', 'trabajador', 'repartidor', 'garzon']
    },
    avatar: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)