const express = require('express');
const router = express.Router();
const { 
  getAvailablePrinters, 
  printThermalComanda, 
  printPDFComanda, 
  printToSystemPrinter,
  printDirectToPort
} = require('../controllers/printController');

// Obtener lista de impresoras disponibles
router.get('/printers', getAvailablePrinters);

// Imprimir comanda en impresora térmica
router.post('/thermal', printThermalComanda);

// Generar PDF de comanda
router.post('/pdf', printPDFComanda);

// Imprimir en impresora específica del sistema
router.post('/system', printToSystemPrinter);

// Imprimir directamente al puerto de la impresora
router.post('/direct', printDirectToPort);

module.exports = router; 