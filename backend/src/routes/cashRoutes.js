const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');

const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { addCashMovement, getCashMovements, deleteCashMovement, createCashRegister, getCurrentCashRegister, getAllCashRegisters, closeCashRegister, getCashRegisterById, getCashRegisterSales, getCurrentCashRegisterSales, broadcastCashRegisterReport } = require('../controllers/cashRegisterController');
const router = express.Router();

router.use(authMiddleware);

// El módulo de caja no forma parte del módulo de mesas del rol mesero,
// salvo la consulta de estado (/current): el mesero necesita saber si la
// caja del restaurante está abierta para poder crear pedidos, aunque no
// pueda abrirla/cerrarla ni ver movimientos o ventas.

// create cash register
router.post('/create', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, createCashRegister); // Route to create a new cash register

// get current cash register (estado visible también para mesero)
router.get('/current', filterByRestaurant, getCurrentCashRegister); // Route to get the current cash register

// close cash register
router.put('/close', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, closeCashRegister); // Route to close the current cash register

// get all cash registers
router.get('/cashRegister', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, getAllCashRegisters); // Route to get all cash registers for a restaurant

// get cash register by id
router.get('/cashRegister/:id', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, getCashRegisterById); // Route to get cash register by ID

// add cash movement
router.post('/movement', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, addCashMovement); // Route to add a cash movement

// get cash movements
router.get('/movement', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, getCashMovements); // Route to get all cash movements for a restaurant

// delete cash movement
router.delete('/movement/:id', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, deleteCashMovement); // Route to delete a cash movement


// get sales from specific cash register
router.get('/sales/:cashRegisterId', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, getCashRegisterSales); // Route to get sales from specific cash register

// get sales from current active cash register
router.get('/sales', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, getCurrentCashRegisterSales); // Route to get sales from current active cash register

// retransmitir reporte de caja ya armado por el cliente a los demás dispositivos
router.post('/broadcast-report', denyRoleMiddleware('mesero', 'cocina'), filterByRestaurant, broadcastCashRegisterReport);

module.exports = router; // Export the router