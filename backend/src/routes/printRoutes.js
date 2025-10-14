const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rutas de impresión usando el servicio local (PrintingService.exe)
 * Todas las rutas están protegidas por autenticación
 */

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Verificar estado del servicio de impresión
router.get('/status', printController.checkPrintServiceStatus);

// Obtener impresoras disponibles
router.get('/printers', printController.getAvailablePrinters);

// Imprimir ticket de orden (para el cliente)
router.post('/order/:orderId', printController.printOrderTicket);

// Imprimir ticket de cocina
router.post('/kitchen/:orderId', printController.printKitchenTicket);

// Imprimir contenido personalizado
router.post('/custom', printController.printCustomContent);

module.exports = router; 