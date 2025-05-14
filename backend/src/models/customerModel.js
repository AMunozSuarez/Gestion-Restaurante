const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    phone: {
        type: String,
        // Eliminamos el "unique: true" de aquí
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
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true, // Asegura que el cliente esté asociado a un restaurante
    },
}, { timestamps: true });

// Creamos un índice compuesto que hace que la combinación de phone + restaurant sea única
// Esto permite el mismo teléfono en diferentes restaurantes, pero único dentro de cada uno
customerSchema.index({ phone: 1, restaurant: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);