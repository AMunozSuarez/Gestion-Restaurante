const Restaurant = require('../models/restaurantModel');

const filterByRestaurant = async (req, res, next) => {
    try {
        if (!req.user || !req.user.restaurant) {
            return res.status(403).json({ message: 'No tienes acceso a ningún restaurante.' });
        }

        req.restaurantId = req.user.restaurant; // Agrega el ID del restaurante al objeto `req`
        next();
    } catch (error) {
        console.error('Error en el middleware de restaurante:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

module.exports = filterByRestaurant;