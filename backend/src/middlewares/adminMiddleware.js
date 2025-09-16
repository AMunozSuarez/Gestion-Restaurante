const userModel = require('../models/userModel');

module.exports = async (req, res, next) => {
    try {
        // Obtener el ID del usuario del token JWT decodificado
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                message: 'Token de autenticación inválido' 
            });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }
        
        if (user.role !== 'super_admin') {
            return res.status(401).json({ 
                success: false,
                message: 'Acceso denegado. Se requieren permisos de super administrador' 
            });
        }
        
        // Agregar información del usuario completo al request
        req.userInfo = user;
        next();
    }
    catch (error) {
        console.log('Error interno en middleware de administrador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
