const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createOrderController, getAllOrdersController, updateOrderController, deleteOrderController, getOrderByIdController, getOrderByNumberController, closeOrder, getFilteredOrders, getRecentOrders, getSectionOrders, getAllSalesController, getTipsController, printTicketController } = require('../controllers/orderController');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

// CREATE A NEW ORDER
router.post('/create', authMiddleware, filterByRestaurant, createOrderController);

// GET ALL ORDERS
router.get('/getAll', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getAllOrdersController);

// GET AN ORDER BY ID
router.get('/get/:id', authMiddleware, filterByRestaurant, getOrderByIdController);

// GET AN ORDER BY NUMBER
router.get('/getByNumber/:orderNumber', authMiddleware, filterByRestaurant, getOrderByNumberController);

// UPDATE AN ORDER
router.put('/update/:id', authMiddleware, filterByRestaurant, updateOrderController);

// DELETE AN ORDER
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, deleteOrderController);

// GET TIPS WITH FILTERS (debe ir antes de rutas genéricas)
router.get('/tips', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getTipsController);

// GET FILTERED ORDERS
router.get('/sales', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getFilteredOrders);

// GET FILTERED ORDERS BY CASH REGISTER
router.get('/sales/cash/:cashRegisterId', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getFilteredOrders);

// GET RECENT ORDERS (limit, status, section)
router.get('/recent', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getRecentOrders);

// GET SECTION ORDERS (active + recent in one call)
router.get('/section', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getSectionOrders);

// GET ALL SALES FOR SALES PAGE (WITHOUT CASH REGISTER FILTER)
router.get('/getAllSales', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, getAllSalesController);

// SOLICITAR IMPRESIÓN DE TICKET DE CLIENTE (desde app)
router.post('/print-ticket/:id', authMiddleware, filterByRestaurant, printTicketController);

module.exports = router; // Export the router