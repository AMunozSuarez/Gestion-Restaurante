const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true, // Asegura que no haya duplicados
    },
    addresses: [
        {
            address: { type: String, required: true },
            deliveryCost: { type: Number, required: true }, // Costo de envío asociado a la dirección
        },
    ],
    comment: {
        type: String,
        default: '', // Comentario opcional
    },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);