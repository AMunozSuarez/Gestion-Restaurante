const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    initialBalance: { type: Number, required: true },
    amountSystem: { type: Number, default: 0 }, // Se calculará basado en las órdenes reales
    status: { type: String, enum: ['Abierta', 'Cerrada'], default: 'Abierta' },
    dateOpened: { type: Date, default: Date.now },
    dateClosed: { type: Date },
    // Eliminado el array interno de orders - ahora usaremos el modelo Order con filtro por cashRegister
    officialIncome: {
        type: Map,
        of: Number, // Almacena los ingresos oficiales por método de pago
        default: {},
    },
    comment: {
        type: String,
        default: '',
    },
});

module.exports = mongoose.model('CashRegister', cashRegisterSchema);