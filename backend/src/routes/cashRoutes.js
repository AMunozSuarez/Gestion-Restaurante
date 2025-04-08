const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { addCashMovement, getCashMovements } = require('../controllers/cashRegisterController');
const router = express.Router();

// Add cach movement routes
router.post('/create', authMiddleware, filterByRestaurant, addCashMovement);

// Get all cach movement routes
router.get('/getAll', authMiddleware, filterByRestaurant, getCashMovements);



module.exports = router; // Export the router