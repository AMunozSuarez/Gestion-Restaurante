const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    phone: {
        type: String,
        unique: true, // Asegura que no haya duplicados
    },
    addresses: [
        {
            address: { type: String},
            deliveryCost: { type: Number}, // Costo de envío asociado a la dirección
        },
    ],
    comment: {
        type: String,
        default: '', // Comentario opcional
    },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);