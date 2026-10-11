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
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: function() {
            // Solo requerido para roles que no sean super_admin
            return this.role !== 'super_admin';
        }
    },
    role: {
        type: String,
        // 'carrito' = pantalla de cliente del mostrador (solo puede ver /pantalla-cliente)
        enum: ['super_admin', 'owner', 'employee', 'mesero', 'cocina', 'carrito'], // Roles posibles
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
    isActive: {
        type: Boolean,
        default: true,
    },
    // Se incrementa para invalidar todos los JWT emitidos (cierre de sesión remoto).
    // Los tokens llevan este valor en el claim `tv`; si no coincide, authMiddleware responde 401.
    tokenVersion: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', userSchema);