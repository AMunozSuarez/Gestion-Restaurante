const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const {
    getSalesReport,
    getProductsReport,
    getCustomersReport,
    getDashboardReport,
    getProductDetailReport,
} = require('../controllers/reportController');

const router = express.Router();

// Dashboard resumen rápido
router.get('/dashboard', authMiddleware, filterByRestaurant, getDashboardReport);

// Reporte de ventas detallado
router.get('/sales', authMiddleware, filterByRestaurant, getSalesReport);

// Reporte de productos (más vendidos, menos vendidos, por categoría)
router.get('/products', authMiddleware, filterByRestaurant, getProductsReport);

// Reporte de clientes
router.get('/customers', authMiddleware, filterByRestaurant, getCustomersReport);

// Detalle de ventas de un producto específico
router.get('/product-detail', authMiddleware, filterByRestaurant, getProductDetailReport);

module.exports = router;