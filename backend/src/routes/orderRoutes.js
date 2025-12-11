const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createOrderController, getAllOrdersController, updateOrderController, deleteOrderController, getOrderByIdController, getOrderByNumberController, closeOrder, getFilteredOrders, getRecentOrders, getAllSalesController } = require('../controllers/orderController');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

// CREATE A NEW ORDER
router.post('/create', authMiddleware, filterByRestaurant, createOrderController);

// GET ALL ORDERS
router.get('/getAll', authMiddleware, filterByRestaurant, getAllOrdersController);

// GET AN ORDER BY ID
router.get('/get/:id', authMiddleware, filterByRestaurant, getOrderByIdController);

// GET AN ORDER BY NUMBER
router.get('/getByNumber/:orderNumber', authMiddleware, filterByRestaurant, getOrderByNumberController);

// UPDATE AN ORDER
router.put('/update/:id', authMiddleware, filterByRestaurant, updateOrderController);

// DELETE AN ORDER
router.delete('/delete/:id', authMiddleware, filterByRestaurant, deleteOrderController);

// GET FILTERED ORDERS
router.get('/sales', authMiddleware, filterByRestaurant, getFilteredOrders);

// GET FILTERED ORDERS BY CASH REGISTER
router.get('/sales/cash/:cashRegisterId', authMiddleware, filterByRestaurant, getFilteredOrders);

// GET RECENT ORDERS (limit, status, section)
router.get('/recent', authMiddleware, filterByRestaurant, getRecentOrders);

// GET ALL SALES FOR SALES PAGE (WITHOUT CASH REGISTER FILTER)
router.get('/getAllSales', authMiddleware, filterByRestaurant, getAllSalesController);

module.exports = router; // Export the router