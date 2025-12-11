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
            orderId: { type: String }, // ID del pedido original
            total: { type: Number, required: true },
            paymentMethod: { type: String, required: true },
            paymentMethods: [{
                method: { type: String },
                amount: { type: Number }
            }], // Métodos de pago múltiples
            items: [{ type: Object }], // Detalles de los productos del pedido
            deliveryCost: { type: Number, default: 0 }, // Costo de delivery
            section: { type: String, enum: ['delivery', 'mostrador'], default: 'mostrador' }, // Sección del pedido
            customerName: { type: String, default: 'Cliente anónimo' }, // Nombre del cliente
            date: { type: Date, default: Date.now },
        },
    ],
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