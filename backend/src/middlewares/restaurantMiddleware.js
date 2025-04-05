const Restaurant = require('../models/restaurantModel');

const filterByRestaurant = async (req, res, next) => {
    try {
        const userRestaurantId = req.user.restaurant; // ID del restaurante del usuario autenticado
        if (!userRestaurantId) {
            return res.status(403).json({ message: 'No tienes acceso a ningún restaurante.' });
        }

        req.restaurantId = userRestaurantId; // Agrega el ID del restaurante al objeto `req`
        next();
    } catch (error) {
        console.error('Error en el middleware de restaurante:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

module.exports = filterByRestaurant;