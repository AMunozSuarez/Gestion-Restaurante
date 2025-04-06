const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    if (process.env.DISABLE_AUTH === 'true') {
        console.warn('JWT verification is disabled (development mode).');
        return next(); // Permite todas las solicitudes sin verificar el token
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
        req.user = decoded; // Configura `req.user` con los datos decodificados del token
        next();
    } catch (error) {
        console.error('Internal auth error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};