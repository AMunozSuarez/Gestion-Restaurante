const roleMiddleware = (requiredRole) => {
    return (req, res, next) => {
        const { role } = req.user; // El rol del usuario autenticado
        if (role !== requiredRole) {
            return res.status(403).send({
                success: false,
                message: 'No tienes permiso para realizar esta acción.',
            });
        }
        next();
    };
};

module.exports = roleMiddleware;