import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, 
  faPrint, 
  faCheck,
  faTimes,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { CheckPrintServiceStatus, GetAvailablePrinters, PrintCustomContent } from '../../services/printService';
import usePrintSettings from '../../hooks/usePrintSettings';
import './SettingsPage.css';

const SettingsPage = () => {
  // Usar el hook de configuraciones de impresión
  const { 
    printSettings, 
    loadPrintSettings, 
    savePrintSettings, 
    updatePrinter 
  } = usePrintSettings();

  // Estados para la interfaz
  const [printers, setPrinters] = useState([]);
  const [printServiceStatus, setPrintServiceStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Estados para detectar cambios
  const [localSettings, setLocalSettings] = useState({
    autoPrintKitchen: false,
    printOrderNumber: true,
    defaultCopies: 1
  });
  const [localPrinter, setLocalPrinter] = useState('');
  const [originalSettings, setOriginalSettings] = useState({
    autoPrintKitchen: false,
    printOrderNumber: true,
    defaultCopies: 1
  });
  const [originalPrinter, setOriginalPrinter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Solo cargar una vez al montar el componente
    if (!initialLoadComplete) {
      loadPrintingSettings();
    }
  }, [initialLoadComplete]);

  // Agregar un effect para detectar cuando el componente se desmonta
  useEffect(() => {
    return () => {
      // Cleanup si es necesario
    };
  }, []);

  // Detectar cambios comparando configuraciones actuales con originales
  useEffect(() => {
    if (!initialLoadComplete) return; // No detectar cambios hasta que se complete la carga inicial
    
    const printerChanged = localPrinter !== originalPrinter;
    const settingsChanged = 
      localSettings.autoPrintKitchen !== originalSettings.autoPrintKitchen ||
      localSettings.printOrderNumber !== originalSettings.printOrderNumber ||
      localSettings.defaultCopies !== originalSettings.defaultCopies;
    
    const hasAnyChanges = printerChanged || settingsChanged;
    setHasChanges(hasAnyChanges);
  }, [localSettings, localPrinter, originalSettings, originalPrinter, initialLoadComplete]);

  const loadPrintingSettings = async () => {
    setLoading(true);
    try {
      // Cargar configuraciones usando el hook
      const currentSettings = loadPrintSettings();
      
      // Verificar que las configuraciones no están vacías o son valores por defecto
      if (!currentSettings || Object.keys(currentSettings).length === 0) {
        console.log('No hay configuraciones guardadas, usando valores por defecto');
      }
      
      // Establecer configuraciones locales para edición con valores seguros
      const settingsToUse = {
        autoPrintKitchen: currentSettings?.autoPrintKitchen === true, // Solo true si explícitamente es true
        printOrderNumber: currentSettings?.printOrderNumber !== false, // true por defecto, false solo si explícitamente es false
        defaultCopies: currentSettings?.defaultCopies && currentSettings.defaultCopies > 0 ? currentSettings.defaultCopies : 1
      };
      
      setLocalSettings(settingsToUse);
      setOriginalSettings(settingsToUse);
      
      const printerToUse = currentSettings?.selectedPrinter || '';
      setLocalPrinter(printerToUse);
      setOriginalPrinter(printerToUse);

      // Verificar estado del servicio
      const statusResponse = await CheckPrintServiceStatus();
      setPrintServiceStatus(statusResponse.available);

      if (statusResponse.available) {
        // Cargar impresoras
        const printersResponse = await GetAvailablePrinters();
        setPrinters(printersResponse.printers || []);
        
        if (printersResponse.printers && printersResponse.printers.length > 0) {
          let finalPrinter = printerToUse;
          
          // Verificar si la impresora guardada está disponible
          if (printerToUse) {
            const foundPrinter = printersResponse.printers.find(
              printer => printer.PrinterName === printerToUse
            );
            
            if (!foundPrinter) {
              // La impresora guardada no está disponible, usar la primera
              finalPrinter = printersResponse.printers[0].PrinterName;
              
              setMessage(`⚠️ Impresora "${printerToUse}" no disponible. Usando "${finalPrinter}"`);
              setMessageType('info');
              setTimeout(() => setMessage(''), 4000);
            } else {
              console.log(`✅ Impresora preferida "${printerToUse}" encontrada y disponible`);
            }
          } else {
            // No hay impresora guardada, usar la primera disponible
            finalPrinter = printersResponse.printers[0].PrinterName;
            console.log(`🔧 No hay impresora guardada, usando primera disponible: ${finalPrinter}`);
          }
          
          // Actualizar estados locales si es necesario
          if (finalPrinter !== printerToUse) {
            setLocalPrinter(finalPrinter);
            setOriginalPrinter(finalPrinter);
            
            // Guardar la nueva impresora
            updatePrinter(finalPrinter);
            console.log(`💾 Impresora actualizada automáticamente: ${finalPrinter}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
      setMessage('Error al cargar configuración de impresión');
      setMessageType('error');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
      console.log('✅ Carga de configuraciones completada');
    }
  };

  const handlePrintSettingChange = (setting, value) => {
    const updatedSettings = { ...localSettings, [setting]: value };
    setLocalSettings(updatedSettings);
  };

  const saveAllSettings = () => {
    setLoading(true);
    
    try {
      // Crear objeto con todas las configuraciones
      const allSettings = {
        selectedPrinter: localPrinter,
        autoPrintKitchen: localSettings.autoPrintKitchen || false,
        printOrderNumber: localSettings.printOrderNumber !== false,
        defaultCopies: localSettings.defaultCopies || 1
      };
      
      // Guardar directamente en localStorage Y usando el hook
      localStorage.setItem('printSettings', JSON.stringify(allSettings));
      localStorage.setItem('selectedPrinter', localPrinter); // Mantener compatibilidad
      
      // También usar el hook
      savePrintSettings(allSettings);
      
      // Actualizar configuraciones originales después de guardar
      setOriginalSettings(localSettings);
      setOriginalPrinter(localPrinter);
      
      setMessage(`✅ Configuración guardada exitosamente${localPrinter ? ` (Impresora: ${localPrinter})` : ''}`);
      setMessageType('success');
      setTimeout(() => setMessage(''), 4000);
      
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      setMessage('❌ Error al guardar la configuración');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const resetAllSettings = () => {
    setLoading(true);
    
    try {
      // Restablecer a configuraciones originales
      setLocalSettings(originalSettings);
      setLocalPrinter(originalPrinter);
      
      setMessage('🔄 Cambios descartados');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al restablecer la configuración');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrinterChange = (printerName) => {
    setLocalPrinter(printerName);
  };

  const retryConnection = async () => {
    setLoading(true);
    try {
      // Verificar estado del servicio
      const statusResponse = await CheckPrintServiceStatus();
      setPrintServiceStatus(statusResponse.available);

      if (statusResponse.available) {
        const printersResponse = await GetAvailablePrinters();
        setPrinters(printersResponse.printers || []);
        
        // Verificar si la impresora local está disponible
        if (localPrinter && printersResponse.printers) {
          const currentPrinterAvailable = printersResponse.printers.find(
            printer => printer.PrinterName === localPrinter
          );
          
          if (!currentPrinterAvailable && printersResponse.printers.length > 0) {
            // La impresora actual no está disponible, usar la primera
            const newPrinter = printersResponse.printers[0].PrinterName;
            setLocalPrinter(newPrinter);
            
            setMessage(`✅ Conexión restablecida. Impresora: ${newPrinter}`);
            setMessageType('success');
          } else {
            setMessage('✅ Conexión restablecida');
            setMessageType('success');
          }
        } else if (printersResponse.printers.length > 0 && !localPrinter) {
          // No hay impresora local, usar la primera disponible
          setLocalPrinter(printersResponse.printers[0].PrinterName);
          setMessage('✅ Conexión restablecida');
          setMessageType('success');
        } else {
          setMessage('✅ Conexión restablecida');
          setMessageType('success');
        }
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ No se pudo conectar al servicio de impresión');
        setMessageType('error');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error al reintentar conexión');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    if (!localPrinter) {
      setMessage('❌ Selecciona una impresora primero');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    setMessage('🖨️ Imprimiendo ticket de prueba...');
    setMessageType('info');

    try {
      // Crear contenido de prueba que refleje la configuración actual
      const fecha = new Date().toLocaleString('es-CL');
      const testContent = `
================================
        TICKET DE PRUEBA
================================
Fecha: ${fecha}
Impresora: ${localPrinter}

CONFIGURACIÓN ACTUAL:
- Impresión automática cocina: ${localSettings.autoPrintKitchen ? 'SÍ' : 'NO'}
- Incluir número de orden: ${localSettings.printOrderNumber ? 'SÍ' : 'NO'}
- Copias por defecto: ${localSettings.defaultCopies}

Este es un ticket de prueba para
verificar que la configuración de
impresión funciona correctamente.

¡Si puedes leer esto, todo está
funcionando bien!
================================
      `.trim();

      const result = await PrintCustomContent(testContent, localPrinter, 1);
      
      if (result.success) {
        setMessage('✅ Ticket de prueba impreso correctamente');
        setMessageType('success');
      } else {
        setMessage('❌ Error al imprimir: ' + (result.message || 'Error desconocido'));
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error en impresión de prueba:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error de conexión';
      setMessage('❌ Error al imprimir: ' + errorMsg);
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const renderPrintingSettings = () => (
    <div className="settings-section">
      <div className="section-header">
        <h3><FontAwesomeIcon icon={faPrint} /> Configuración de Impresión</h3>
        <p>Configura las opciones de impresión para tickets y comandas</p>
        {hasChanges && (
          <div className="changes-indicator">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>Tienes cambios sin guardar</span>
          </div>
        )}
      </div>

      {/* Estado del servicio */}
      <div className="setting-group">
        <h4>Estado del Servicio de Impresión</h4>
        <div className={`service-status ${printServiceStatus ? 'online' : 'offline'}`}>
          <FontAwesomeIcon icon={printServiceStatus ? faCheck : faTimes} />
          <span>
            {printServiceStatus ? 'Servicio disponible' : 'Servicio no disponible'}
          </span>
          {!printServiceStatus && (
            <div className="download-installer">
              <button 
                onClick={() => window.open('URL_DEL_INSTALADOR', '_blank')}
                className="download-button"
              >
                Descargar Instalador del Servicio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selección de impresora */}
      <div className="setting-group">
        <h4>Impresora Predeterminada</h4>
        <div className="printer-selection">
          {printers.length > 0 ? (
            <>
              <select
                value={localPrinter}
                onChange={(e) => handlePrinterChange(e.target.value)}
                className="printer-select"
              >
                <option value="">Seleccionar impresora...</option>
                {printers.map((printer) => (
                  <option key={printer.PrinterName} value={printer.PrinterName}>
                    {printer.PrinterName} {printer.Status === 'Available' ? '✓' : '⚠️'}
                  </option>
                ))}
              </select>
              {localPrinter && (
                <div className="printer-test-section">
                  <button 
                    onClick={handleTestPrint}
                    className="test-print-button"
                    disabled={loading || !localPrinter}
                  >
                    <FontAwesomeIcon icon={faPrint} />
                    Imprimir Prueba
                  </button>
                  <small style={{ display: 'block', marginTop: '4px', opacity: 0.8 }}>
                    Imprime un ticket de prueba para verificar la configuración
                  </small>
                </div>
              )}
            </>
          ) : (
            <div className="no-printers">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>No se encontraron impresoras. Verifica que el servicio esté corriendo.</span>
            </div>
          )}
        </div>
      </div>

      {/* Configuraciones adicionales de impresión */}
      <div className="setting-group">
        <h4>Opciones de Impresión</h4>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.autoPrintKitchen || false}
              onChange={(e) => handlePrintSettingChange('autoPrintKitchen', e.target.checked)}
            />
            Imprimir automáticamente comandas de cocina al crear/actualizar órdenes
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={localSettings.printOrderNumber !== false}
              onChange={(e) => handlePrintSettingChange('printOrderNumber', e.target.checked)}
            />
            Incluir número de orden en tickets de cliente
          </label>
        </div>
        <div className="setting-item">
          <label>
            Número de copias por defecto:
            <input
              type="number"
              min="1"
              max="5"
              value={localSettings.defaultCopies || 1}
              onChange={(e) => handlePrintSettingChange('defaultCopies', parseInt(e.target.value))}
              className="copies-input"
            />
          </label>
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
            Se aplica cuando no se especifica un número de copias manualmente
          </small>
        </div>
      </div>

      {/* Botón para guardar configuraciones - Solo visible si hay cambios */}
      {hasChanges && (
        <div className="setting-actions">
          <button 
            onClick={saveAllSettings}
            className="save-settings-button"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faCheck} />
            Guardar Cambios
          </button>
          <button 
            onClick={resetAllSettings}
            className="reset-settings-button"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faTimes} />
            Descartar Cambios
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1><FontAwesomeIcon icon={faCog} /> Configuración de Impresión</h1>
        <p>Configura las opciones de impresión para tickets y comandas</p>
      </div>

      {message && (
        <div className={`settings-message ${messageType}`}>
          <FontAwesomeIcon icon={messageType === 'success' ? faCheck : faExclamationTriangle} />
          {message}
        </div>
      )}

      <div className="settings-container">
        <div className="settings-content single-section">
          {renderPrintingSettings()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;