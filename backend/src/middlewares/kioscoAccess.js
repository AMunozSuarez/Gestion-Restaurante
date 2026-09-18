/**
 * Allowlist central de rutas para el rol `kiosco` (dispositivo de autoservicio).
 *
 * El resto del proyecto usa blacklist (denyRoleMiddleware), pero para el kiosco eso es
 * frágil: cada ruta nueva quedaría abierta por omisión. El kiosco es un dispositivo
 * físicamente accesible al público con un token válido en localStorage, así que aquí se
 * invierte el criterio: todo prohibido salvo lo que necesita explícitamente.
 *
 * Las rutas de /api/auth no aparecen porque no pasan por authMiddleware.
 */
const KIOSCO_ALLOWED = [
    { method: 'GET', test: (path) => path.startsWith('/api/self-service/') },
    { method: 'POST', test: (path) => path === '/api/self-service/order' },
    // El kiosco lee el restaurante para conocer settings.selfService (misma ruta que usa
    // useRestaurant en el frontend).
    { method: 'GET', test: (path) => path.startsWith('/api/restaurant/get/') },
    { method: 'GET', test: (path) => path === '/api/restaurant/settings/me' },
    // Solo devuelve el propio token decodificado del kiosco; no expone datos de terceros.
    { method: 'GET', test: (path) => path === '/api/auth/verify' },
];

const normalizePath = (req) => {
    const raw = `${req.baseUrl || ''}${req.path || ''}`;
    // Quitar la barra final para que '/api/self-service/menu/' matchee igual que sin barra.
    return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const isPathAllowedForKiosco = (req) => {
    const path = normalizePath(req);
    return KIOSCO_ALLOWED.some((rule) => rule.method === req.method && rule.test(path));
};

module.exports = { isPathAllowedForKiosco, KIOSCO_ALLOWED };
