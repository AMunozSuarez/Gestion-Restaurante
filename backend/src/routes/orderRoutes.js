const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createOrderController, getAllOrdersController, updateOrderController, deleteOrderController, getOrderByIdController, getOrderByNumberController } = require('../controllers/orderController');
const router = express.Router();

// CREATE A NEW ORDER
router.post('/create', authMiddleware, createOrderController);

// GET ALL ORDERS
router.get('/getAll', authMiddleware, getAllOrdersController);

// GET AN ORDER BY ID
router.get('/get/:id', authMiddleware, getOrderByIdController);

// GET AN ORDER BY NUMBER
router.get('/getByNumber/:orderNumber', authMiddleware, getOrderByNumberController);

// UPDATE AN ORDER
router.put('/update/:id', authMiddleware, updateOrderController);

// DELETE AN ORDER
router.delete('/delete/:id', authMiddleware, deleteOrderController);

module.exports = router; // Export the router