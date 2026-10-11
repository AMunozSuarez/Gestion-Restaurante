const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { isTokenVersionCurrent } = require('../services/sessionService');

// El rol carrito (pantalla de cliente) vive del socket: solo necesita leer la
// configuración del restaurante. Allowlist en vez de agregar 'carrito' a cada
// denyRoleMiddleware, para que una ruta nueva no le quede abierta por olvido.
const CARRITO_ALLOWED_REQUESTS = [
    { method: 'GET', path: '/api/restaurant/settings/me' },
];

const isAllowedForCarrito = (req) => {
    const path = (req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
    return CARRITO_ALLOWED_REQUESTS.some((rule) => rule.method === req.method && rule.path === path);
};

module.exports = async (req, res, next) => {
    if (process.env.DISABLE_AUTH === 'true') {
        console.warn('JWT verification is disabled (development mode).');
        return next();
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token missing' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que el usuario sigue activo y que su sesión no fue cerrada remotamente
        const user = await User.findById(decoded.id).select('isActive tokenVersion').lean();
        if (!user || user.isActive === false) {
            return res.status(401).json({ success: false, message: 'User account is disabled' });
        }
        if (!isTokenVersionCurrent(decoded, user)) {
            return res.status(401).json({ success: false, message: 'Session revoked' });
        }

        if (decoded.role === 'carrito' && !isAllowedForCarrito(req)) {
            return res.status(403).json({ success: false, message: 'Acceso no permitido para la pantalla de cliente' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Internal auth error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};
