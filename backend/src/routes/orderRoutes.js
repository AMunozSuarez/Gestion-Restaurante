const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createOrderController, getAllOrdersController, updateOrderController, updateOrderItemReadyController, deleteOrderController, getOrderByIdController, getOrderByNumberController, closeOrder, getFilteredOrders, getRecentOrders, getSectionOrders, getAllSalesController, getTipsController, printTicketController, broadcastTicketPrint } = require('../controllers/orderController');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

// CREATE A NEW ORDER
// El rol kiosco queda fuera: debe entrar por POST /api/self-service/order, que fuerza
// section/payment/discount/tip y valida que los productos estén publicados en autoservicio.
router.post('/create', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, createOrderController);

// GET ALL ORDERS
router.get('/getAll', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getAllOrdersController);

// GET AN ORDER BY ID
router.get('/get/:id', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, getOrderByIdController);

// GET AN ORDER BY NUMBER
router.get('/getByNumber/:orderNumber', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, getOrderByNumberController);

// UPDATE AN ORDER
router.put('/update/:id', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, updateOrderController);

// MARK/UNMARK A SINGLE ORDER ITEM AS READY (KDS per-item)
router.put('/item-ready/:id', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, updateOrderItemReadyController);

// DELETE AN ORDER
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, deleteOrderController);

// GET TIPS WITH FILTERS (debe ir antes de rutas genéricas)
router.get('/tips', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getTipsController);

// GET FILTERED ORDERS
router.get('/sales', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getFilteredOrders);

// GET FILTERED ORDERS BY CASH REGISTER
router.get('/sales/cash/:cashRegisterId', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getFilteredOrders);

// GET RECENT ORDERS (limit, status, section)
router.get('/recent', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getRecentOrders);

// GET SECTION ORDERS (active + recent in one call)
// NOTA: 'cocina' SÍ necesita esta ruta — es la que usa el KDS para cargar los pedidos.
router.get('/section', authMiddleware, denyRoleMiddleware('mesero', 'kiosco'), filterByRestaurant, getSectionOrders);

// GET ALL SALES FOR SALES PAGE (WITHOUT CASH REGISTER FILTER)
router.get('/getAllSales', authMiddleware, denyRoleMiddleware('mesero', 'cocina', 'kiosco'), filterByRestaurant, getAllSalesController);

// SOLICITAR IMPRESIÓN DE TICKET DE CLIENTE (desde app)
router.post('/print-ticket/:id', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, printTicketController);

// RETRANSMITIR TICKET YA ARMADO POR EL CLIENTE A LOS DEMÁS DISPOSITIVOS (cierre de mesa, impresión manual, cuentas divididas)
router.post('/broadcast-ticket', authMiddleware, denyRoleMiddleware('kiosco'), filterByRestaurant, broadcastTicketPrint);

module.exports = router; // Export the router