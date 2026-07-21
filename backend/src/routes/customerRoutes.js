const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { searchCustomersController, createCustomerController, createOrUpdateCustomerController } = require('../controllers/customerControllers');
const router = express.Router();

// El módulo de clientes no forma parte del módulo de mesas del rol mesero
router.use(authMiddleware, denyRoleMiddleware('mesero'));

// Ruta para buscar clientes
router.get('/search', filterByRestaurant, searchCustomersController);

// Ruta para crear un nuevo cliente
router.post('/create', filterByRestaurant, createCustomerController);

// Ruta para actualizar un cliente existente
router.put('/update/:id', filterByRestaurant, createCustomerController);

// Ruta para crear o actualizar un cliente
router.post('/create-or-update', filterByRestaurant, createOrUpdateCustomerController);

module.exports = router;