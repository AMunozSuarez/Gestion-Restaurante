const express = require('express');
const { createRestaurantWithUser, getRestaurantById } = require('../controllers/restaurantController');
const router = express.Router();

// Ruta para crear un restaurante con un usuario por defecto
router.post('/create', createRestaurantWithUser);

// Ruta para obtener un restaurante por ID
router.get('/get/:id', getRestaurantById);

module.exports = router;