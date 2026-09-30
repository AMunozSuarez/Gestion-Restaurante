const crypto = require('crypto');

/**
 * Cifrado simétrico para credenciales de terceros guardadas en BD (p. ej. la API Key de
 * Haulmer de cada restaurante). AES-256-GCM: además de cifrar, detecta si el texto fue
 * alterado.
 *
 * La clave maestra vive SOLO en la variable de entorno PAYMENT_SECRETS_KEY (32 bytes en
 * base64). Si se pierde o se cambia, las credenciales guardadas dejan de poder descifrarse
 * y hay que volver a ingresarlas desde el panel de SuperAdmin.
 *
 * Formato guardado: "v1:<iv base64>:<authTag base64>:<cifrado base64>".
 */

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

const getMasterKey = () => {
    const raw = process.env.PAYMENT_SECRETS_KEY;
    if (!raw) {
        const error = new Error('PAYMENT_SECRETS_KEY no está configurada en el servidor.');
        error.code = 'SECRETS_KEY_MISSING';
        throw error;
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        const error = new Error('PAYMENT_SECRETS_KEY debe ser de 32 bytes codificados en base64.');
        error.code = 'SECRETS_KEY_INVALID';
        throw error;
    }
    return key;
};

const encryptSecret = (plainText) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
};

const decryptSecret = (payload) => {
    const [version, ivB64, tagB64, dataB64] = String(payload || '').split(':');
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
        const error = new Error('Credencial cifrada con formato inválido.');
        error.code = 'SECRET_INVALID_FORMAT';
        throw error;
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
};

const isSecretsKeyConfigured = () => {
    try {
        getMasterKey();
        return true;
    } catch (_) {
        return false;
    }
};

module.exports = { encryptSecret, decryptSecret, isSecretsKeyConfigured };
