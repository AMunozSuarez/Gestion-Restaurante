const printServiceClient = require('../services/printServiceClient');
const Order = require('../models/orderModel');

/**
 * Controlador de impresión usando el servicio local (PrintingService.exe)
 * Este controlador maneja todas las operaciones de impresión para el restaurante
 */

/**
 * Verifica el estado del servicio de impresión
 */
const checkPrintServiceStatus = async (req, res) => {
  try {
    const isAvailable = await printServiceClient.isAvailable();
    res.json({ 
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Servicio de impresión disponible' : 'Servicio de impresión no disponible'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      available: false,
      error: error.message 
    });
  }
};

/**
 * Obtiene las impresoras disponibles desde el servicio local
 */
const getAvailablePrinters = async (req, res) => {
  try {
    const isAvailable = await printServiceClient.isAvailable();
    
    if (!isAvailable) {
      return res.status(503).json({ 
        success: false,
        error: 'Servicio de impresión no disponible',
        message: 'Asegúrate de que el servicio de impresión esté corriendo'
      });
    }

    const printers = await printServiceClient.getPrinters();
    res.json({ 
      success: true,
      printers 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error al obtener las impresoras'
    });
  }
};

/**
 * Imprime el ticket de una orden (para el cliente)
 */
const printOrderTicket = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { printerName, copies = 1, printOrderNumber = true } = req.body;

    const order = await Order.findById(orderId)
      .populate('foods.food')
      .populate('buyer')
      .populate('restaurant');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Orden no encontrada' 
      });
    }

    const restaurant = order.restaurant;

    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurante no encontrado' 
      });
    }

    const ticketContent = printServiceClient.formatOrderTicket(order, restaurant, { printOrderNumber });
    const result = await printServiceClient.print(ticketContent, printerName, copies);

    res.json({
      success: true,
      message: `Ticket impreso correctamente (${copies} copia${copies > 1 ? 's' : ''})`,
      result
    });
  } catch (error) {
    console.error('Error printing order:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error al imprimir el ticket'
    });
  }
};

/**
 * Imprime el ticket de cocina
 */
const printKitchenTicket = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { printerName, copies = 1 } = req.body;

    const order = await Order.findById(orderId)
      .populate('foods.food')
      .populate('buyer')
      .populate('restaurant');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Orden no encontrada' 
      });
    }

    const restaurant = order.restaurant;

    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurante no encontrado' 
      });
    }

    const ticketContent = printServiceClient.formatKitchenTicket(order, restaurant);
    const result = await printServiceClient.print(ticketContent, printerName, copies);

    res.json({
      success: true,
      message: `Ticket de cocina impreso correctamente (${copies} copia${copies > 1 ? 's' : ''})`,
      result
    });
  } catch (error) {
    console.error('Error printing kitchen ticket:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error al imprimir el ticket de cocina'
    });
  }
};

/**
 * Imprime contenido personalizado
 */
const printCustomContent = async (req, res) => {
  try {
    const { content, printerName, copies } = req.body;

    if (!content) {
      return res.status(400).json({ 
        success: false,
        error: 'El contenido es requerido' 
      });
    }

    const result = await printServiceClient.print(content, printerName, copies);

    res.json({
      success: true,
      message: 'Contenido impreso correctamente',
      result
    });
  } catch (error) {
    console.error('Error printing custom content:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error al imprimir'
    });
  }
};

module.exports = {
  checkPrintServiceStatus,
  getAvailablePrinters,
  printOrderTicket,
  printKitchenTicket,
  printCustomContent
};
