const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { addCashMovement, getCashMovements, createCashRegister, getCurrentCashRegister, getAllCashRegisters, closeCashRegister, getCashRegisterById, closeOrder } = require('../controllers/cashRegisterController');
const router = express.Router();

// create cash register
router.post('/create', authMiddleware, filterByRestaurant, createCashRegister); // Route to create a new cash register

// get current cash register
router.get('/current', authMiddleware, filterByRestaurant, getCurrentCashRegister); // Route to get the current cash register

// close cash register
router.put('/close', authMiddleware, filterByRestaurant, closeCashRegister); // Route to close the current cash register

// get all cash registers
router.get('/cashRegister', authMiddleware, filterByRestaurant, getAllCashRegisters); // Route to get all cash registers for a restaurant

// get cash register by id
router.get('/cashRegister/:id', authMiddleware, filterByRestaurant, getCashRegisterById); // Route to get cash register by ID

// add cash movement
router.post('/movement', authMiddleware, filterByRestaurant, addCashMovement); // Route to add a cash movement

// get cash movements
router.get('/movement', authMiddleware, filterByRestaurant, getCashMovements); // Route to get all cash movements for a restaurant


// Close an order
router.post('/order/close', authMiddleware, filterByRestaurant, closeOrder); // Route to close an order

module.exports = router; // Export the router