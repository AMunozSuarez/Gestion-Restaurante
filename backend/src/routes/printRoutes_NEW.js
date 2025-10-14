const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController_NEW');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación (ajusta según tu proyecto)
// Si no usas auth, comenta esta línea
router.use(authMiddleware);

// ===== NUEVOS ENDPOINTS CON SERVICIO LOCAL =====

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

// ===== ENDPOINTS DE COMPATIBILIDAD (antiguos) =====

// Imprimir comanda en impresora térmica
router.post('/thermal', printController.printThermalComanda);

// Imprimir en impresora específica del sistema
router.post('/system', printController.printToSystemPrinter);

// Generar PDF de comanda
router.post('/pdf', printController.printPDFComanda);

// Imprimir directamente al puerto de la impresora
router.post('/direct', printController.printDirectToPort);

module.exports = router;
