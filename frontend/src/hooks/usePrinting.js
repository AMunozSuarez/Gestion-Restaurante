import { useState, useEffect, useCallback } from 'react';
import printingService from '../services/printingService';

export const usePrinting = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [serviceStatus, setServiceStatus] = useState('checking'); // checking, online, offline
  const [loading, setLoading] = useState(false);

  // Cargar impresoras guardadas del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedPrinter');
    const defaultSaved = printingService.getDefaultPrinter();
    
    if (saved) {
      setSelectedPrinter(saved);
    }
    if (defaultSaved) {
      setDefaultPrinter(defaultSaved);
    }
  }, []);

  // Verificar servicio y cargar impresoras
  const checkServiceAndLoadPrinters = useCallback(async () => {
    setLoading(true);
    setServiceStatus('checking');
    
    try {
      const healthResponse = await printingService.checkHealth();
      
      if (healthResponse.success) {
        setServiceStatus('online');
        const printersResponse = await printingService.getPrinters();
        
        if (printersResponse.success) {
          // Normalizar el formato de las impresoras
          const normalizedPrinters = (printersResponse.data || []).map(printer => {
            return typeof printer === 'string' ? printer : printer.PrinterName;
          });
          setPrinters(normalizedPrinters);
        }
      } else {
        setServiceStatus('offline');
        setPrinters([]);
      }
    } catch (error) {
      setServiceStatus('offline');
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Seleccionar impresora
  const selectPrinter = useCallback((printerName) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('selectedPrinter', printerName);
  }, []);

  // Establecer impresora predeterminada
  const setDefaultPrinterCallback = useCallback((printerName) => {
    setDefaultPrinter(printerName);
    printingService.setDefaultPrinter(printerName);
  }, []);

  // Remover impresora predeterminada
  const removeDefaultPrinter = useCallback(() => {
    setDefaultPrinter('');
    printingService.removeDefaultPrinter();
  }, []);

  // Imprimir contenido
  const print = useCallback(async (content, copies = 1) => {
    if (!selectedPrinter) {
      throw new Error('No hay impresora seleccionada');
    }

    const response = await printingService.print(selectedPrinter, content, copies);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }, [selectedPrinter]);

  // Imprimir con impresora predeterminada
  const printWithDefault = useCallback(async (content, copies = 1) => {
    const response = await printingService.printWithDefault(content, copies);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }, []);

  // Imprimir página de prueba
  const printTest = useCallback(async () => {
    if (!selectedPrinter) {
      throw new Error('No hay impresora seleccionada');
    }

    const response = await printingService.printTest(selectedPrinter);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }, [selectedPrinter]);

  // Imprimir comanda de cocina
  const printKitchenOrder = useCallback(async (order) => {
    const response = await printingService.printKitchenOrder(order);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }, []);

  return {
    printers,
    selectedPrinter,
    defaultPrinter,
    serviceStatus,
    loading,
    checkServiceAndLoadPrinters,
    selectPrinter,
    setDefaultPrinter: setDefaultPrinterCallback,
    removeDefaultPrinter,
    print,
    printWithDefault,
    printTest,
    printKitchenOrder,
    isServiceOnline: serviceStatus === 'online',
    hasPrinterSelected: !!selectedPrinter,
    hasDefaultPrinter: !!defaultPrinter
  };
};

export default usePrinting;