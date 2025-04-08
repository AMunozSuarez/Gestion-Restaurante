const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    initialBalance: { type: Number, required: true },
    amountSystem: { type: Number, default: 0 },
    status: { type: String, enum: ['Abierta', 'Cerrada'], default: 'Abierta' },
    dateOpened: { type: Date, default: Date.now },
    dateClosed: { type: Date },
    orders: [
        {
            total: { type: Number, required: true },
            paymentMethod: { type: String, required: true },
            items: [{ type: Object }], // Detalles de los productos del pedido
            date: { type: Date, default: Date.now },
        },
    ],
    officialIncome: {
        type: Map,
        of: Number, // Almacena los ingresos oficiales por método de pago
        default: {},
    },
});

module.exports = mongoose.model('CashRegister', cashRegisterSchema);