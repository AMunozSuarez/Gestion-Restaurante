const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { isPathAllowedForKiosco } = require('./kioscoAccess');

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

        // Verificar que el usuario sigue activo en la base de datos
        const user = await User.findById(decoded.id).select('isActive').lean();
        if (!user || user.isActive === false) {
            return res.status(401).json({ success: false, message: 'User account is disabled' });
        }

        // El rol kiosco solo puede tocar el módulo de autoservicio. Se valida aquí, en un
        // único punto, para que ninguna ruta futura quede abierta por omisión.
        if (decoded.role === 'kiosco' && !isPathAllowedForKiosco(req)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a este módulo.',
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Internal auth error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};