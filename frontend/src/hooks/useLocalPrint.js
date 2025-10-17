import { useState, useEffect, useCallback } from 'react';
import localPrintApi from '../api/localPrintApi';

/**
 * Hook para gestionar la impresión local
 * Detecta automáticamente si el servicio de impresión está disponible
 * y proporciona funciones para imprimir
 */
export const useLocalPrint = () => {
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Verifica si el servicio de impresión local está disponible
   */
  const checkService = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const available = await localPrintApi.isAvailable();
      setIsServiceAvailable(available);
      
      if (available) {
        // Si está disponible, obtener impresoras
        try {
          const printersList = await localPrintApi.getPrinters();
          // Extraer solo los nombres de las impresoras
          const printerNames = printersList.map(p => p.PrinterName || p);
          setPrinters(printerNames);
          
          // Seleccionar la primera impresora por defecto
          if (printerNames.length > 0 && !selectedPrinter) {
            setSelectedPrinter(printerNames[0]);
          }
        } catch (err) {
          console.error('Error obteniendo impresoras:', err);
          setError('No se pudieron obtener las impresoras');
        }
      }
      
      return available;
    } catch (err) {
      console.error('Error verificando servicio:', err);
      setIsServiceAvailable(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [selectedPrinter]);

  /**
   * Verifica el servicio al montar el componente
   */
  useEffect(() => {
    checkService();
    
    // Verificar periódicamente cada 30 segundos
    const interval = setInterval(checkService, 30000);
    
    return () => clearInterval(interval);
  }, [checkService]);

  /**
   * Imprime el ticket de una orden
   */
  const printOrder = useCallback(async (order, restaurant, options = {}) => {
    setError(null);
    
    if (!isServiceAvailable) {
      const errorMsg = 'Servicio de impresión no disponible. Instala la aplicación de impresión.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const result = await localPrintApi.printOrderTicket(
        order,
        restaurant,
        selectedPrinter,
        {
          printOrderNumber: options.printOrderNumber !== false,
          copies: options.copies || 1
        }
      );
      
      return result;
    } catch (err) {
      console.error('Error imprimiendo orden:', err);
      setError(err.message);
      throw err;
    }
  }, [isServiceAvailable, selectedPrinter]);

  /**
   * Imprime el ticket de cocina
   */
  const printKitchen = useCallback(async (order, restaurant) => {
    setError(null);
    
    if (!isServiceAvailable) {
      const errorMsg = 'Servicio de impresión no disponible. Instala la aplicación de impresión.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const result = await localPrintApi.printKitchenTicket(
        order,
        restaurant,
        selectedPrinter
      );
      
      return result;
    } catch (err) {
      console.error('Error imprimiendo ticket de cocina:', err);
      setError(err.message);
      throw err;
    }
  }, [isServiceAvailable, selectedPrinter]);

  /**
   * Imprime contenido personalizado
   */
  const printCustom = useCallback(async (content, copies = 1) => {
    setError(null);
    
    if (!isServiceAvailable) {
      const errorMsg = 'Servicio de impresión no disponible. Instala la aplicación de impresión.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const result = await localPrintApi.print(content, selectedPrinter, copies);
      return result;
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError(err.message);
      throw err;
    }
  }, [isServiceAvailable, selectedPrinter]);

  /**
   * Recarga la lista de impresoras
   */
  const refreshPrinters = useCallback(async () => {
    if (!isServiceAvailable) {
      return [];
    }

    try {
      const printersList = await localPrintApi.getPrinters();
      setPrinters(printersList);
      return printersList;
    } catch (err) {
      console.error('Error actualizando impresoras:', err);
      setError('No se pudieron actualizar las impresoras');
      return [];
    }
  }, [isServiceAvailable]);

  return {
    // Estado
    isServiceAvailable,
    isChecking,
    printers,
    selectedPrinter,
    error,
    
    // Acciones
    checkService,
    printOrder,
    printKitchen,
    printCustom,
    refreshPrinters,
    setSelectedPrinter,
    
    // Utilidades
    clearError: () => setError(null)
  };
};

export default useLocalPrint;
