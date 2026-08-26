const mongoose = require('mongoose');

// Movimiento manual de caja: dinero que entra o sale sin ser una venta.
const CASH_MOVEMENT_TYPES = ['Ingreso', 'Egreso'];

const cashMovementSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister', required: true },
    type: { type: String, enum: CASH_MOVEMENT_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    // Comentario opcional: para qué fue el ingreso o egreso
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Nombre del usuario al momento del registro: el reporte impreso debe seguir
    // siendo fiel aunque el usuario cambie de nombre o sea dado de baja.
    createdByName: { type: String, trim: true, default: '' },
}, { timestamps: true });

// Query más frecuente: movimientos de una caja ordenados por fecha
cashMovementSchema.index({ cashRegister: 1, createdAt: -1 });
cashMovementSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = mongoose.model('CashMovement', cashMovementSchema);
module.exports.CASH_MOVEMENT_TYPES = CASH_MOVEMENT_TYPES;
