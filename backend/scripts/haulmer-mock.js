/**
 * Simulador local de la API "Pago remoto" v2 de Haulmer/TUU, para probar el kiosco sin POS.
 *
 *   node scripts/haulmer-mock.js            (puerto 4010, o MOCK_PORT)
 *   HAULMER_BASE_URL=http://localhost:4010  en backend/.env
 *
 * Cualquier API Key no vacía es válida. Ciclo de cada cobro: Sent (1) → Processing (3) a los
 * 3 s → resultado a los 10 s. El resultado depende del monto:
 *   - termina en 13 → Failed (4)      p. ej. $1.013
 *   - termina en 22 → Canceled (2)    p. ej. $1.022
 *   - cualquier otro → Completed (5)
 * MOCK_RATE_LIMIT=1 simula el límite real de 1 cobro por minuto por terminal (429).
 */
const express = require('express');

const PORT = Number(process.env.MOCK_PORT) || 4010;
const RATE_LIMIT = process.env.MOCK_RATE_LIMIT === '1';

const app = express();
app.use(express.json());

const payments = new Map();
const lastByDevice = new Map();

const requireKey = (req, res, next) => {
    if (!req.header('X-API-Key')) {
        return res.status(401).json({ code: 'KEY-002', message: 'API Key is missing in the request header' });
    }
    next();
};

const currentStatus = (payment) => {
    const elapsed = Date.now() - payment.createdAt;
    if (elapsed < 3000) return 1;
    if (elapsed < 10000) return 3;
    if (payment.amount % 100 === 13) return 4;
    if (payment.amount % 100 === 22) return 2;
    return 5;
};

app.post('/RemotePayment/v2/Create', requireKey, (req, res) => {
    const { idempotencyKey, amount, device, paymentMethod } = req.body || {};
    console.log('[mock] Create', req.body);

    if (!idempotencyKey || String(idempotencyKey).length > 36) {
        return res.status(400).json({ code: 'RP-001', message: 'Idempotency Key length must be between 1 and 36 characters' });
    }
    if (!device) return res.status(400).json({ code: 'MR-161', message: 'Device by SN not found' });
    if (![1, 2].includes(paymentMethod)) return res.status(400).json({ code: 'RP-008', message: 'Missing payment method' });
    if (!Number.isInteger(amount) || amount < 100) {
        return res.status(400).json({ code: 'RP-028', message: 'Invalid amount, must be equal to or greater than 100' });
    }

    const existing = payments.get(idempotencyKey);
    if (existing) {
        return res.status(200).json({ idempotencyKey, status: currentStatus(existing) });
    }

    if (RATE_LIMIT && Date.now() - (lastByDevice.get(device) || 0) < 60000) {
        return res.status(429).json({ code: 'INT-MIDDLEWARE-429', message: 'API Quota Exceeded! Quota: 1 per 1m, Try Again in 60 seconds' });
    }
    lastByDevice.set(device, Date.now());

    const payment = { idempotencyKey, amount, device, paymentMethod, createdAt: Date.now() };
    payments.set(idempotencyKey, payment);
    res.status(201).json({ idempotencyKey, status: 1 });
});

app.get('/RemotePayment/v2/GetPaymentRequest/:key', requireKey, (req, res) => {
    const payment = payments.get(req.params.key);
    if (!payment) {
        return res.status(404).json({ code: 'RP-200', message: 'Payment request not found for the provided idempotency key' });
    }
    const status = currentStatus(payment);
    res.json({
        idempotencyKey: payment.idempotencyKey,
        amount: payment.amount,
        device: payment.device,
        status,
        ...(status === 5 ? { authorizationCode: 'MOCK01', cardType: payment.paymentMethod === 1 ? 'credito' : 'debito', last4: '4242' } : {}),
    });
});

app.listen(PORT, () => console.log(`[mock] Haulmer Pago remoto simulado en http://localhost:${PORT}`));
