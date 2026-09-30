const mongoose = require('mongoose');

/**
 * Cobro con tarjeta de un pedido de autoservicio ANTES de que el pedido exista.
 *
 * El kiosco no crea el pedido hasta que el POS confirma el pago: esta sesión guarda el
 * carrito tal como se validó y el monto exacto cobrado. Al completarse el pago, POST
 * /self-service/order se arma desde `cartSnapshot` (nunca desde lo que mande el cliente) y
 * la sesión pasa a `consumed` con la referencia al pedido.
 *
 * Ciclo: pending → sent → processing → completed → finalizing → consumed
 *                                     ↘ canceled | failed
 * `finalizing` es un lock corto mientras se crea el pedido: evita que un doble toque o un
 * reintento de red creen dos pedidos por el mismo pago.
 *
 * _id sirve también como idempotencyKey en Haulmer (24 chars, dentro del límite de 36).
 */

const SESSION_STATUSES = ['pending', 'sent', 'processing', 'completed', 'canceled', 'failed', 'finalizing', 'consumed'];

const kioskPaymentSessionSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    kioskUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['haulmer'], default: 'haulmer' },
    device: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['credito', 'debito'], required: true },
    dteType: { type: Number, default: 48 },
    cartSnapshot: {
        foods: { type: mongoose.Schema.Types.Mixed, required: true },
        customerName: { type: String, default: '' },
        comment: { type: String, default: '' },
    },
    status: { type: String, enum: SESSION_STATUSES, default: 'pending' },
    providerStatus: { type: String, default: null },
    providerId: { type: String, default: null },
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    paidAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
}, { timestamps: true });

kioskPaymentSessionSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
kioskPaymentSessionSchema.index({ device: 1, createdAt: -1 });
// Las sesiones son operativas; lo contable queda en el pedido (order.remotePayment).
kioskPaymentSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('KioskPaymentSession', kioskPaymentSessionSchema);
module.exports.SESSION_STATUSES = SESSION_STATUSES;
