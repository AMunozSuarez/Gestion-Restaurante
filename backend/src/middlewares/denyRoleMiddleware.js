// Bloquea el acceso a la ruta si el rol del usuario autenticado está en la lista de roles denegados.
const denyRoleMiddleware = (...deniedRoles) => (req, res, next) => {
    if (deniedRoles.includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permiso para acceder a este módulo.',
        });
    }
    next();
};

module.exports = denyRoleMiddleware;
