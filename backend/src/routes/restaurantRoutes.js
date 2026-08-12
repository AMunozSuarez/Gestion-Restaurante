const express = require('express');
const {
	createRestaurantWithUser,
	getRestaurantById,
	getMyRestaurantSettings,
	updateMyRestaurantSettings,
} = require('../controllers/restaurantController');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

// Ruta para crear un restaurante con un usuario por defecto
router.post('/create', createRestaurantWithUser);

// Ruta para obtener un restaurante por ID
router.get('/get/:id', getRestaurantById);

// Configuracion compartida del restaurante (web + app meseros)
router.get('/settings/me', authMiddleware, filterByRestaurant, getMyRestaurantSettings);
router.put('/settings/me', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, updateMyRestaurantSettings);

module.exports = router;