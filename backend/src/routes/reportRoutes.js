const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const filterByRestaurant = require('../middlewares/filterByRestaurant');
const { getSalesReport } = require('../controllers/reportController');
const router = express.Router();


// Get sales report routes
router.get('/sales', authMiddleware, filterByRestaurant, getSalesReport);

module.exports = router; // Export the router