import { useState, useEffect, useCallback } from 'react';
import printingService from '../services/printingService';
import printerConfigService from '../services/printerConfigService';

export const usePrinting = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [printerRoles, setPrinterRoles] = useState({});
  const [serviceStatus, setServiceStatus] = useState('checking'); // checking, online, offline
  const [loading, setLoading] = useState(false);

  // Cargar impresoras guardadas del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedPrinter');
    const defaultSaved = printingService.getDefaultPrinter();
    const roles = printerConfigService.getPrinterRoles();
    
    if (saved) {
      setSelectedPrinter(saved);
    }
    if (defaultSaved) {
      setDefaultPrinter(defaultSaved);
    }
    setPrinterRoles(roles);
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

  // Establecer impresora para un rol
  const setPrinterForRole = useCallback((role, printerName) => {
    printerConfigService.setPrinterForRole(role, printerName);
    setPrinterRoles(printerConfigService.getPrinterRoles());
  }, []);

  // Remover impresora de un rol
  const removePrinterRole = useCallback((role) => {
    printerConfigService.removePrinterRole(role);
    setPrinterRoles(printerConfigService.getPrinterRoles());
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
  const printKitchenOrder = useCallback(async (order, options = {}) => {
    const response = await printingService.printKitchenOrder(order, options);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }, []);

  const hasMultiPrinterConfig = Object.keys(printerRoles).length > 0;

  return {
    printers,
    selectedPrinter,
    defaultPrinter,
    printerRoles,
    serviceStatus,
    loading,
    checkServiceAndLoadPrinters,
    selectPrinter,
    setDefaultPrinter: setDefaultPrinterCallback,
    removeDefaultPrinter,
    setPrinterForRole,
    removePrinterRole,
    print,
    printWithDefault,
    printTest,
    printKitchenOrder,
    isServiceOnline: serviceStatus === 'online',
    hasPrinterSelected: !!selectedPrinter,
    hasDefaultPrinter: !!defaultPrinter,
    hasMultiPrinterConfig,
  };
};

export default usePrinting;