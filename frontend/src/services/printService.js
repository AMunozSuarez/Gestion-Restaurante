import axiosInstance from './axiosConfig';

// URL de la API del backend
const API_URL = '/print';

/**
 * Servicio de impresión para el frontend
 * Se comunica con el backend que a su vez se comunica con el servicio de impresión local (PrintingService.exe)
 */

/**
 * Verifica el estado del servicio de impresión
 */
export const CheckPrintServiceStatus = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/status`);
    return response.data;
  } catch (error) {
    console.error('Error checking print service status:', error);
    throw error;
  }
};

/**
 * Obtiene las impresoras disponibles
 */
export const GetAvailablePrinters = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL}/printers`);
    return response.data;
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
    // Si no se especifican copias, usar la configuración guardada
    let finalCopies = copies;
    let printOrderNumber = true;
    
    if (copies === null || printOrderNumber === undefined) {
      const printSettings = localStorage.getItem('printSettings');
      if (printSettings) {
        const settings = JSON.parse(printSettings);
        if (finalCopies === null) {
          finalCopies = settings.defaultCopies || 1;
        }
        printOrderNumber = settings.printOrderNumber !== false; // Por defecto true
      } else {
        finalCopies = 1;
      }
    }

    const response = await axiosInstance.post(`${API_URL}/order/${orderId}`, {
      printerName,
      copies: finalCopies,
      printOrderNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error printing order ticket:', error);
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
    // Si no se especifican copias, usar la configuración guardada
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

    const response = await axiosInstance.post(`${API_URL}/kitchen/${orderId}`, {
      printerName,
      copies: finalCopies
    });
    return response.data;
  } catch (error) {
    console.error('Error printing kitchen ticket:', error);
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
    const response = await axiosInstance.post(`${API_URL}/custom`, {
      content,
      printerName,
      copies
    });
    return response.data;
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
