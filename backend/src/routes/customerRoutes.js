const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { searchCustomersController } = require('../controllers/customerControllers');
const router = express.Router();

// Ruta para buscar clientes
router.get('/search', authMiddleware, filterByRestaurant, searchCustomersController);

module.exports = router;