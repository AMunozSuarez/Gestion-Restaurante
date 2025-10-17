import axiosInstance from './axiosConfig';
import localPrintApi from '../api/localPrintApi';
import React from 'react';

/**
 * Servicio de impresión para el frontend
 * NUEVO: Ahora se comunica directamente con el servicio de impresión local en localhost:8088
 * Esto elimina la necesidad de que el backend se conecte al servicio local
 */

/**
 * Verifica el estado del servicio de impresión
 */
export const CheckPrintServiceStatus = async () => {
  try {
    const available = await localPrintApi.isAvailable();
    return {
      success: true,
      available,
      message: available ? 'Servicio de impresión disponible' : 'Servicio de impresión no disponible'
    };
  } catch (error) {
    console.error('Error checking print service status:', error);
    return {
      success: false,
      available: false,
      message: error.message
    };
  }
};

/**
 * Obtiene las impresoras disponibles
 */
export const GetAvailablePrinters = async () => {
  try {
    const printersList = await localPrintApi.getPrinters();
    // Formatear para mantener compatibilidad con el código existente
    const formattedPrinters = printersList.map((printer, index) => {
      // Si printer es string, convertir a objeto
      if (typeof printer === 'string') {
        return {
          PrinterName: printer,
          Status: 'Available',
          IsDefault: false
        };
      }
      // Si ya es objeto, mantenerlo pero asegurar propiedades
      return {
        PrinterName: printer.PrinterName || printer,
        Status: printer.Status || 'Available', 
        IsDefault: printer.IsDefault || false
      };
    });
    
    return {
      success: true,
      printers: formattedPrinters
    };
  } catch (error) {
    console.error('Error fetching printers:', error);
    throw error;
  }
};

/**
 * Imprime el ticket de una orden (para el cliente)
 * @param {string} orderId - ID de la orden
 * @param {string} printerName - Nombre de la impresora (opcional)
 * @param {number} copies - Número de copias (opcional)
 */
export const PrintOrderTicket = async (orderId, printerName = null, copies = null) => {
  try {
    // Obtener la orden del backend (ruta correcta)
    const orderResponse = await axiosInstance.get(`/order/get/${orderId}`);
    const order = orderResponse.data.order;
    
    // Obtener información del restaurante (ruta correcta)
    const restaurantResponse = await axiosInstance.get(`/restaurant/get/${order.restaurant}`);
    const restaurant = restaurantResponse.data.restaurant;
    
    // Obtener configuración de impresión
    let finalCopies = copies;
    let printOrderNumber = true;
    
    if (copies === null || printOrderNumber === undefined) {
      const printSettings = localStorage.getItem('printSettings');
      if (printSettings) {
        const settings = JSON.parse(printSettings);
        if (finalCopies === null) {
          finalCopies = settings.defaultCopies || 1;
        }
        printOrderNumber = settings.printOrderNumber !== false;
      } else {
        finalCopies = 1;
      }
    }

    // Imprimir directamente usando el servicio local
    const result = await localPrintApi.printOrderTicket(
      order,
      restaurant,
      printerName,
      { copies: finalCopies, printOrderNumber }
    );
    
    return {
      success: true,
      message: `Ticket impreso correctamente (${finalCopies} copia${finalCopies > 1 ? 's' : ''})`,
      result
    };
  } catch (error) {
    console.error('Error printing order ticket:', error);
    
    // Si es error 404, la orden no existe
    if (error.response?.status === 404) {
      throw new Error(`Orden ${orderId} no encontrada. Es posible que haya sido eliminada.`);
    }
    
    // Si es error de conexión al servicio de impresión
    if (error.code === 'ECONNREFUSED' || error.message.includes('localhost:8088')) {
      throw new Error('Servicio de impresión no disponible. Verifica que esté instalado y corriendo.');
    }
    
    throw error;
  }
};

/**
 * Imprime el ticket de cocina
 * @param {string} orderId - ID de la orden
 * @param {string} printerName - Nombre de la impresora (opcional)
 * @param {number} copies - Número de copias (opcional)
 */
export const PrintKitchenTicket = async (orderId, printerName = null, copies = null) => {
  try {
    // Obtener la orden del backend (ruta correcta)
    const orderResponse = await axiosInstance.get(`/order/get/${orderId}`);
    const order = orderResponse.data.order;
    
    // Obtener información del restaurante (ruta correcta)
    const restaurantResponse = await axiosInstance.get(`/restaurant/get/${order.restaurant}`);
    const restaurant = restaurantResponse.data.restaurant;
    
    // Obtener configuración de copias
    let finalCopies = copies;
    
    if (copies === null) {
      const printSettings = localStorage.getItem('printSettings');
      if (printSettings) {
        const settings = JSON.parse(printSettings);
        finalCopies = settings.defaultCopies || 1;
      } else {
        finalCopies = 1;
      }
    }

    // Imprimir directamente usando el servicio local
    const result = await localPrintApi.printKitchenTicket(
      order,
      restaurant,
      printerName
    );
    
    return {
      success: true,
      message: 'Ticket de cocina impreso correctamente',
      result
    };
  } catch (error) {
    console.error('Error printing kitchen ticket:', error);
    
    // Si es error 404, la orden no existe
    if (error.response?.status === 404) {
      throw new Error(`Orden ${orderId} no encontrada. Es posible que haya sido eliminada.`);
    }
    
    // Si es error de conexión al servicio de impresión
    if (error.code === 'ECONNREFUSED' || error.message.includes('localhost:8088')) {
      throw new Error('Servicio de impresión no disponible. Verifica que esté instalado y corriendo.');
    }
    
    throw error;
  }
};

/**
 * Imprime contenido personalizado
 * @param {string} content - Contenido a imprimir
 * @param {string} printerName - Nombre de la impresora (opcional)
 * @param {number} copies - Número de copias (default: 1)
 */
export const PrintCustomContent = async (content, printerName = null, copies = 1) => {
  try {
    const result = await localPrintApi.print(content, printerName, copies);
    return {
      success: true,
      message: 'Contenido impreso correctamente',
      result
    };
  } catch (error) {
    console.error('Error printing custom content:', error);
    throw error;
  }
};

/**
 * Hook personalizado para usar el servicio de impresión en React
 */
export const UsePrintService = () => {
  const [printers, setPrinters] = React.useState([]);
  const [selectedPrinter, setSelectedPrinter] = React.useState(null);
  const [serviceAvailable, setServiceAvailable] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Verificar estado del servicio y cargar impresoras
  const checkServiceAndLoadPrinters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar servicio
      const statusResponse = await CheckPrintServiceStatus();
      const isAvailable = statusResponse.available;
      setServiceAvailable(isAvailable);

      if (isAvailable) {
        // Cargar impresoras
        const printersResponse = await GetAvailablePrinters();
        setPrinters(printersResponse.printers || []);
        
        if (printersResponse.printers && printersResponse.printers.length > 0) {
          setSelectedPrinter(printersResponse.printers[0].printerName);
        }
      }
    } catch (err) {
      setError(err.message);
      setServiceAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // Imprimir orden
  const handlePrintOrder = async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await PrintOrderTicket(orderId, selectedPrinter);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Imprimir ticket de cocina
  const handlePrintKitchen = async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await PrintKitchenTicket(orderId, selectedPrinter);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    serviceAvailable,
    loading,
    error,
    checkServiceAndLoadPrinters,
    handlePrintOrder,
    handlePrintKitchen
  };
};

export default {
  CheckPrintServiceStatus,
  GetAvailablePrinters,
  PrintOrderTicket,
  PrintKitchenTicket,
  PrintCustomContent,
  UsePrintService
};
