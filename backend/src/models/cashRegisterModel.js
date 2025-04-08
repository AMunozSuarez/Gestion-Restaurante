const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    type: { type: String, enum: ['Ingreso', 'Egreso'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CashRegister', cashRegisterSchema);