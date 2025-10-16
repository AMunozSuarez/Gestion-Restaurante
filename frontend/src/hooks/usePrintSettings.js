import { useState, useEffect } from 'react';

/**
 * Hook personalizado para gestionar configuraciones de impresión
 * Se encarga de cargar, guardar y sincronizar configuraciones entre componentes
 */
export const usePrintSettings = () => {
  const [printSettings, setPrintSettings] = useState({
    selectedPrinter: '',
    autoPrintKitchen: false,
    printOrderNumber: true,
    defaultCopies: 1
  });

  // Cargar configuraciones al inicializar
  useEffect(() => {
    loadPrintSettings();
  }, []);

  const loadPrintSettings = () => {
    try {
      // Cargar configuraciones nuevas
      const savedSettings = localStorage.getItem('printSettings');
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setPrintSettings(parsed);
        return parsed;
      }

      // Fallback: cargar configuración legacy solo si no hay configuraciones nuevas
      const legacyPrinter = localStorage.getItem('selectedPrinter');
      
      if (legacyPrinter) {
        const legacySettings = {
          selectedPrinter: legacyPrinter,
          autoPrintKitchen: false,
          printOrderNumber: true,
          defaultCopies: 1
        };
        // Guardar configuración legacy directamente
        setPrintSettings(legacySettings);
        localStorage.setItem('printSettings', JSON.stringify(legacySettings));
        return legacySettings;
      }

      // Solo devolver configuración por defecto si realmente no hay nada guardado
      const defaultSettings = {
        selectedPrinter: '',
        autoPrintKitchen: false,
        printOrderNumber: true,
        defaultCopies: 1
      };
      // NO establecer automáticamente la configuración por defecto, solo devolverla
      return defaultSettings;
    } catch (error) {
      console.error('Error loading print settings:', error);
      // En caso de error, devolver la configuración actual del estado
      return printSettings;
    }
  };

  const savePrintSettings = (newSettings) => {
    try {
      const settingsToSave = { ...printSettings, ...newSettings };
      setPrintSettings(settingsToSave);
      localStorage.setItem('printSettings', JSON.stringify(settingsToSave));
      
      // Mantener compatibilidad con componentes legacy
      if (settingsToSave.selectedPrinter) {
        localStorage.setItem('selectedPrinter', settingsToSave.selectedPrinter);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving print settings:', error);
      return false;
    }
  };

  const updatePrinter = (printerName) => {
    return savePrintSettings({ selectedPrinter: printerName });
  };

  const updateSetting = (key, value) => {
    return savePrintSettings({ [key]: value });
  };

  const resetSettings = () => {
    const defaultSettings = {
      selectedPrinter: '',
      autoPrintKitchen: false,
      printOrderNumber: true,
      defaultCopies: 1
    };
    
    localStorage.removeItem('printSettings');
    localStorage.removeItem('selectedPrinter');
    setPrintSettings(defaultSettings);
    
    return defaultSettings;
  };

  // Función para obtener configuraciones actuales sin estado reactivo
  const getCurrentSettings = () => {
    try {
      const saved = localStorage.getItem('printSettings');
      return saved ? JSON.parse(saved) : printSettings;
    } catch {
      return printSettings;
    }
  };

  return {
    printSettings,
    loadPrintSettings,
    savePrintSettings,
    updatePrinter,
    updateSetting,
    resetSettings,
    getCurrentSettings
  };
};

export default usePrintSettings;