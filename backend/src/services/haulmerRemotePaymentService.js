const axios = require('axios');

/**
 * Cliente de "Pago remoto" de Haulmer/TUU (flujo v2, con idempotencia).
 * Docs: https://developers.tuu.cl — Pago remoto.
 *
 * - POST /RemotePayment/v2/Create                         → envía el cobro al POS
 * - GET  /RemotePayment/v2/GetPaymentRequest/:idempotency → consulta su estado
 *
 * Nada de este archivo conoce restaurantes ni pedidos: recibe la API Key ya descifrada y
 * devuelve resultados normalizados. La forma exacta del JSON de respuesta v2 no está en la
 * documentación pública, así que los parsers aceptan camelCase, PascalCase y envoltorios
 * `data`; la respuesta completa se devuelve en `raw` para poder ajustarlo con un POS real.
 */

const DEFAULT_BASE_URL = 'https://integrations.payment.haulmer.com';
const REQUEST_TIMEOUT_MS = 15000;
const SOURCE_NAME = 'OrdenPlus';
const SOURCE_VERSION = 'v1.0.0';

// Tabla de conversión de solicitud (docs "Estados de las Solicitudes de Pago").
const STATUS_BY_CODE = {
    0: 'pending',
    1: 'sent',
    2: 'canceled',
    3: 'processing',
    4: 'failed',
    5: 'completed',
};
const TERMINAL_STATUSES = ['canceled', 'failed', 'completed'];

// paymentMethod de v2: crédito (1) o débito (2).
const PAYMENT_METHOD_CODES = { credito: 1, debito: 2 };

// Mensajes para el cliente final (kiosco) y el administrador. Los que no están aquí se
// muestran con el mensaje genérico y el código, para poder buscarlo en la documentación.
const ERROR_MESSAGES = {
    'MR-000': 'La API Key no está autorizada.',
    'MR-100': 'No hay un POS asociado a esta API Key.',
    'MR-110': 'El monto es menor al mínimo permitido ($100).',
    'MR-120': 'El monto supera el máximo permitido.',
    'MR-130': 'Tipo de documento (DTE) no reconocido.',
    'MR-140': 'Falta el monto exento para DTE 99.',
    'MR-141': 'El monto exento no coincide con el total.',
    'MR-161': 'No se encontró el POS con ese número de serie.',
    'MR-170': 'El servicio de pagos tuvo un error interno.',
    'MR-180': 'El POS tiene demasiados cobros en cola.',
    'MR-191': 'Este cobro ya fue enviado anteriormente.',
    'MR-203': 'El cobro está siendo procesado.',
    'KEY-002': 'Falta la API Key.',
    'KEY-003': 'La API Key no es válida.',
    'RP-008': 'Falta el método de pago.',
    'RP-020': 'Método de pago no permitido.',
    'RP-025': 'Método de pago no válido.',
    'RP-028': 'El monto debe ser de al menos $100.',
    'RP-029': 'No se encontró la configuración del POS.',
    'RP-032': 'El POS no acepta el método de pago elegido.',
    'RP-100': 'Acceso no autorizado al servicio de pagos.',
    'RP-101': 'Cuenta de pagos no encontrada.',
    'RP-200': 'El cobro no existe en el servicio de pagos.',
    'INT-MIDDLEWARE-429': 'El POS está recibiendo demasiadas solicitudes.',
};

const getBaseUrl = () => (process.env.HAULMER_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const pick = (obj, ...keys) => {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
};

// Algunas respuestas vienen envueltas ({ data: {...} } / { Data: {...} }).
const unwrap = (body) => {
    const inner = pick(body, 'data', 'Data', 'paymentRequest', 'PaymentRequest', 'result', 'Result');
    return inner && typeof inner === 'object' ? inner : body;
};

const mapStatus = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    if (Number.isInteger(numeric) && STATUS_BY_CODE[numeric]) return STATUS_BY_CODE[numeric];
    const text = String(value).trim().toLowerCase();
    if (text === 'cancelled') return 'canceled';
    return Object.values(STATUS_BY_CODE).includes(text) ? text : null;
};

const extractErrorCode = (body) => {
    if (!body || typeof body !== 'object') return null;
    const direct = pick(body, 'code', 'Code', 'errorCode', 'ErrorCode');
    if (direct) return String(direct);
    const nested = pick(body, 'error', 'Error', 'errors', 'Errors');
    if (Array.isArray(nested) && nested.length > 0) return extractErrorCode(nested[0]);
    if (nested && typeof nested === 'object') return extractErrorCode(nested);
    return null;
};

const extractErrorMessage = (body) => {
    if (!body) return null;
    if (typeof body === 'string') return body.slice(0, 300);
    const direct = pick(body, 'message', 'Message', 'detail', 'title');
    if (direct) return String(direct);
    const nested = pick(body, 'error', 'Error', 'errors', 'Errors');
    if (Array.isArray(nested) && nested.length > 0) return extractErrorMessage(nested[0]);
    if (nested && typeof nested === 'object') return extractErrorMessage(nested);
    return null;
};

class HaulmerError extends Error {
    constructor({ code, message, httpStatus, retryAfterSeconds, raw, network = false }) {
        super(ERROR_MESSAGES[code] || message || 'Error en el servicio de pagos.');
        this.name = 'HaulmerError';
        this.code = code || (network ? 'NETWORK_ERROR' : `HTTP-${httpStatus || 'UNKNOWN'}`);
        this.providerMessage = message || null;
        this.httpStatus = httpStatus || null;
        this.retryAfterSeconds = retryAfterSeconds || null;
        this.network = network;
        this.raw = raw;
    }

    get isRateLimited() {
        return this.httpStatus === 429 || this.code === 'INT-MIDDLEWARE-429';
    }
}

const toHaulmerError = (error) => {
    if (!error.response) {
        return new HaulmerError({ message: 'No se pudo conectar con el servicio de pagos.', network: true });
    }
    const { status, data, headers } = error.response;
    const retryHeader = Number(headers?.['retry-after']);
    // El mensaje de cuota trae el tiempo: "... Try Again in 2 seconds".
    const retryFromMessage = Number((extractErrorMessage(data) || '').match(/try again in (\d+)/i)?.[1]);
    return new HaulmerError({
        code: extractErrorCode(data) || (status === 429 ? 'INT-MIDDLEWARE-429' : null),
        message: extractErrorMessage(data),
        httpStatus: status,
        retryAfterSeconds: retryHeader || retryFromMessage || (status === 429 ? 60 : null),
        raw: data,
    });
};

const buildClient = (apiKey) => axios.create({
    baseURL: getBaseUrl(),
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': apiKey,
    },
});

// Normaliza la respuesta de Create/Get a los campos que usa el sistema.
const normalizePaymentResponse = (body) => {
    const data = unwrap(body) || {};
    const transaction = pick(data, 'transaction', 'Transaction', 'paymentData', 'PaymentData') || {};
    return {
        status: mapStatus(pick(data, 'status', 'Status', 'state', 'State')),
        providerId: pick(data, 'id', 'Id', 'paymentRequestId', 'PaymentRequestId') ?? null,
        cardType: pick(data, 'cardType', 'CardType', 'paymentMethod', 'PaymentMethod')
            ?? pick(transaction, 'cardType', 'CardType', 'paymentMethod', 'PaymentMethod') ?? null,
        authCode: pick(data, 'authorizationCode', 'AuthorizationCode', 'authCode', 'AuthCode')
            ?? pick(transaction, 'authorizationCode', 'AuthorizationCode', 'authCode', 'AuthCode') ?? null,
        last4: pick(data, 'last4', 'Last4', 'lastDigits', 'LastDigits', 'cardLast4')
            ?? pick(transaction, 'last4', 'Last4', 'lastDigits', 'LastDigits', 'cardLast4') ?? null,
        raw: body,
    };
};

/**
 * Envía el cobro al POS. `idempotencyKey` (1-36 chars) identifica el cobro: reenviar la
 * misma clave dentro de 10 minutos no genera un segundo cobro.
 */
const createPayment = async ({ apiKey, device, amount, paymentMethod, dteType = 48, idempotencyKey, description }) => {
    const methodCode = PAYMENT_METHOD_CODES[paymentMethod];
    if (!methodCode) throw new HaulmerError({ code: 'RP-025' });

    const numericDte = Number(dteType);
    const extradata = { sourceName: SOURCE_NAME, sourceVersion: SOURCE_VERSION };
    // DTE exento: el monto exento debe ser igual al total (validación MR-141 / RP-006).
    if (numericDte === 99 || numericDte === 34) extradata.exemptAmount = amount;

    const body = {
        idempotencyKey: String(idempotencyKey),
        amount: Math.round(amount),
        device: String(device),
        description: String(description || 'Pedido').slice(0, 100),
        dteType: numericDte,
        paymentMethod: methodCode,
        extradata,
    };

    try {
        const response = await buildClient(apiKey).post('/RemotePayment/v2/Create', body);
        return normalizePaymentResponse(response.data);
    } catch (error) {
        throw toHaulmerError(error);
    }
};

const getPayment = async ({ apiKey, idempotencyKey }) => {
    try {
        const response = await buildClient(apiKey)
            .get(`/RemotePayment/v2/GetPaymentRequest/${encodeURIComponent(idempotencyKey)}`);
        return normalizePaymentResponse(response.data);
    } catch (error) {
        throw toHaulmerError(error);
    }
};

module.exports = {
    createPayment,
    getPayment,
    mapStatus,
    normalizePaymentResponse,
    HaulmerError,
    TERMINAL_STATUSES,
    PAYMENT_METHOD_CODES,
    ERROR_MESSAGES,
};
