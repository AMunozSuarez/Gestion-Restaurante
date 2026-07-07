const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const {
    getSalesReport,
    getProductsReport,
    getCustomersReport,
    getDashboardReport,
    getProductDetailReport,
} = require('../controllers/reportController');

const router = express.Router();

// El módulo de reportes no forma parte del módulo de mesas del rol mesero
router.use(authMiddleware, denyRoleMiddleware('mesero'));

// Dashboard resumen rápido
router.get('/dashboard', filterByRestaurant, getDashboardReport);

// Reporte de ventas detallado
router.get('/sales', filterByRestaurant, getSalesReport);

// Reporte de productos (más vendidos, menos vendidos, por categoría)
router.get('/products', filterByRestaurant, getProductsReport);

// Reporte de clientes
router.get('/customers', filterByRestaurant, getCustomersReport);

// Detalle de ventas de un producto específico
router.get('/product-detail', filterByRestaurant, getProductDetailReport);

module.exports = router;