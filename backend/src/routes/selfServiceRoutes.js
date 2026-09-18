const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const {
    getSelfServiceMenuController,
    getSelfServiceStatusController,
    assertSelfServiceEnabled,
    validateSelfServiceItems,
    enforceSelfServiceOrderPayload,
} = require('../controllers/selfServiceController');
const { createOrderController } = require('../controllers/orderController');

const router = express.Router();

// El restaurante sale del JWT, igual que en el resto del sistema: el kiosco no puede
// pedirle el catálogo ni crear pedidos a otro restaurante.
router.use(authMiddleware, filterByRestaurant);

// CATÁLOGO FILTRADO PARA EL CLIENTE FINAL
router.get('/menu', getSelfServiceMenuController);

// ESTADO LIGERO PARA EL POLLING DEL KIOSCO
router.get('/status', getSelfServiceStatusController);

// CREAR PEDIDO DESDE EL KIOSCO
// Las reglas del canal viven en los middlewares; la creación en sí reutiliza el MISMO
// createOrderController que usa el POS, para no duplicar la validación de extras, el
// recálculo del total ni la numeración de pedidos.
router.post(
    '/order',
    assertSelfServiceEnabled,
    validateSelfServiceItems,
    enforceSelfServiceOrderPayload,
    createOrderController
);

module.exports = router;
