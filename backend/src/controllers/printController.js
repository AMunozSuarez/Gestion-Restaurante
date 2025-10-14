const printServiceClient = require('../services/printServiceClient');
const Order = require('../models/orderModel');
const Restaurant = require('../models/restaurantModel');

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
    // Primero verificar si el servicio está disponible
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
    const { printerName } = req.body;

    // Obtener la orden con populate (usar foods en lugar de items)
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

    // El restaurante ya viene poblado
    const restaurant = order.restaurant;

    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurante no encontrado' 
      });
    }

    // Formatear el ticket
    const ticketContent = printServiceClient.formatOrderTicket(order, restaurant);

    // Imprimir
    const result = await printServiceClient.print(ticketContent, printerName);

    res.json({
      success: true,
      message: 'Ticket impreso correctamente',
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
    const { printerName } = req.body;

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

    // Formatear ticket de cocina
    const ticketContent = printServiceClient.formatKitchenTicket(order, restaurant);

    // Imprimir
    const result = await printServiceClient.print(ticketContent, printerName);

    res.json({
      success: true,
      message: 'Ticket de cocina impreso correctamente',
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

/**
 * Imprime una comanda térmica (compatibilidad con código anterior)
 */
const printThermalComanda = async (req, res) => {
  try {
    const { order, printerName } = req.body;
    
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Datos del pedido requeridos'
      });
    }

    // Si order es un ID, obtenerlo de la base de datos
    let fullOrder = order;
    if (typeof order === 'string') {
      fullOrder = await Order.findById(order)
        .populate('items.food')
        .populate('foods.food')
        .populate('table')
        .populate('customer')
        .populate('waiter');
    }

    const restaurant = await Restaurant.findById(fullOrder.restaurant);

    // Formatear el ticket
    const ticketContent = printServiceClient.formatOrderTicket(fullOrder, restaurant);

    // Imprimir
    const result = await printServiceClient.print(ticketContent, printerName);

    res.json({
      success: true,
      message: 'Comanda impresa correctamente',
      result
    });
    
  } catch (error) {
    console.error('Error imprimiendo comanda térmica:', error);
    res.status(500).json({
      success: false,
      message: 'Error imprimiendo comanda térmica',
      error: error.message
    });
  }
};

/**
 * Alias para compatibilidad con código anterior
 */
const printToSystemPrinter = printOrderTicket;
const printPDFComanda = printOrderTicket;
const printDirectToPort = printKitchenTicket;

module.exports = {
  // Nuevas funciones
  checkPrintServiceStatus,
  getAvailablePrinters,
  printOrderTicket,
  printKitchenTicket,
  printCustomContent,
  
  // Funciones de compatibilidad
  printThermalComanda,
  printToSystemPrinter,
  printPDFComanda,
  printDirectToPort
};
