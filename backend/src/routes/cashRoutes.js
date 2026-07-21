const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');

const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { addCashMovement, getCashMovements, createCashRegister, getCurrentCashRegister, getAllCashRegisters, closeCashRegister, getCashRegisterById, getCashRegisterSales, getCurrentCashRegisterSales } = require('../controllers/cashRegisterController');
const router = express.Router();

router.use(authMiddleware);

// El módulo de caja no forma parte del módulo de mesas del rol mesero,
// salvo la consulta de estado (/current): el mesero necesita saber si la
// caja del restaurante está abierta para poder crear pedidos, aunque no
// pueda abrirla/cerrarla ni ver movimientos o ventas.

// create cash register
router.post('/create', denyRoleMiddleware('mesero'), filterByRestaurant, createCashRegister); // Route to create a new cash register

// get current cash register (estado visible también para mesero)
router.get('/current', filterByRestaurant, getCurrentCashRegister); // Route to get the current cash register

// close cash register
router.put('/close', denyRoleMiddleware('mesero'), filterByRestaurant, closeCashRegister); // Route to close the current cash register

// get all cash registers
router.get('/cashRegister', denyRoleMiddleware('mesero'), filterByRestaurant, getAllCashRegisters); // Route to get all cash registers for a restaurant

// get cash register by id
router.get('/cashRegister/:id', denyRoleMiddleware('mesero'), filterByRestaurant, getCashRegisterById); // Route to get cash register by ID

// add cash movement
router.post('/movement', denyRoleMiddleware('mesero'), filterByRestaurant, addCashMovement); // Route to add a cash movement

// get cash movements
router.get('/movement', denyRoleMiddleware('mesero'), filterByRestaurant, getCashMovements); // Route to get all cash movements for a restaurant


// get sales from specific cash register
router.get('/sales/:cashRegisterId', denyRoleMiddleware('mesero'), filterByRestaurant, getCashRegisterSales); // Route to get sales from specific cash register

// get sales from current active cash register
router.get('/sales', denyRoleMiddleware('mesero'), filterByRestaurant, getCurrentCashRegisterSales); // Route to get sales from current active cash register

module.exports = router; // Export the router