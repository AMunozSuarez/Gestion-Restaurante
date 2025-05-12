const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { searchCustomersController, createCustomerController, createOrUpdateCustomerController } = require('../controllers/customerControllers');
const router = express.Router();

// Ruta para buscar clientes
router.get('/search', authMiddleware, filterByRestaurant, searchCustomersController);

// Ruta para crear un nuevo cliente
router.post('/create', authMiddleware, filterByRestaurant, createCustomerController);

// Ruta para actualizar un cliente existente
router.put('/update/:id', authMiddleware, filterByRestaurant, createCustomerController);

// Ruta para crear o actualizar un cliente
router.post('/create-or-update', authMiddleware, filterByRestaurant, createOrUpdateCustomerController);

module.exports = router;