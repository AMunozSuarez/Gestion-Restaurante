import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faCog, faCheck } from '@fortawesome/free-solid-svg-icons';
import { PrintOrderTicket, PrintKitchenTicket, GetAvailablePrinters } from '../../services/printService';
import usePrintSettings from '../../hooks/usePrintSettings';
import './PrintButton.css';

/**
 * Componente de botón de impresión mejorado
 * Usa el nuevo sistema de impresión con PrintingService.exe
 * Configuración ahora se maneja desde la página de configuración
 */
const PrintButton = ({ order, type = 'customer', buttonText, className = '', showConfig = false, printServiceAvailable = true }) => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');
  
  // Usar el hook de configuraciones de impresión
  const { printSettings, updatePrinter, loadPrintSettings } = usePrintSettings();
  const { selectedPrinter, defaultCopies } = printSettings;

  // Cargar impresoras disponibles al montar
  useEffect(() => {
    loadPrinters();
    loadPrintSettings(); // Cargar configuraciones guardadas
  }, []);

  const loadPrinters = async () => {
    try {
      const response = await GetAvailablePrinters();
      if (response.success && response.printers) {
        setPrinters(response.printers);
        
        // NO cambiar automáticamente la impresora seleccionada
        // La configuración debe venir del hook/localStorage
      }
    } catch (error) {
      console.error('Error cargando impresoras:', error);
    }
  };

  const handlePrint = async () => {
    if (!order) {
      setMessage('Error: No hay orden para imprimir');
      return;
    }
    
    const orderId = order._id || order.id;
    if (!orderId) {
      setMessage('Error: La orden no tiene ID');
      return;
    }

    if (!selectedPrinter) {
      setMessage('Error: Configura la impresora en Configuración');
      return;
    }

    setLoading(true);
    setMessage('Imprimiendo...');

    try {
      let result;
      if (type === 'kitchen') {
        result = await PrintKitchenTicket(orderId, selectedPrinter);
      } else {
        // PrintOrderTicket ya usa automáticamente defaultCopies y printOrderNumber desde localStorage
        result = await PrintOrderTicket(orderId, selectedPrinter);
      }

      if (result.success) {
        setMessage('✅ ' + result.message);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage('❌ Error: ' + errorMsg);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrinterChange = (printerName) => {
    updatePrinter(printerName);
    setMessage('✅ Impresora guardada');
    setTimeout(() => setMessage(''), 2000);
  };

  if (!printServiceAvailable) {
    // No mostrar el botón si el servicio no está disponible
    return null;
  }
  return (
    <div className={`print-button-container ${className}`}>
      <button
        onClick={handlePrint}
        disabled={loading || !selectedPrinter}
        className={type === 'customer' ? 'print-icon-only' : 'print-button'}
        title={selectedPrinter ? 
          `Imprimir en ${selectedPrinter}` : 
          (showConfig ? 'Selecciona una impresora' : 'Configura la impresora en Configuración')
        }
      >
        <FontAwesomeIcon icon={faPrint} />
        {type !== 'customer' && (buttonText || (type === 'kitchen' ? 'Imprimir Cocina' : 'Imprimir Ticket'))}
      </button>

      {showConfig && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="print-config-button"
          title="Configurar impresora"
        >
          <FontAwesomeIcon icon={faCog} />
        </button>
      )}

      {message && <div className="print-message">{message}</div>}

      {showSettings && showConfig && (
        <div className="print-settings">
          <h4>Configuración de Impresión</h4>
          
          <div className="printer-list">
            <label>Impresora:</label>
            {printers.length === 0 ? (
              <p className="no-printers">No se encontraron impresoras. Verifica que el servicio de impresión esté corriendo.</p>
            ) : (
              <select
                value={selectedPrinter}
                onChange={(e) => handlePrinterChange(e.target.value)}
                className="printer-select"
              >
                {printers.map((printer) => (
                  <option key={printer.PrinterName} value={printer.PrinterName}>
                    {printer.PrinterName} {printer.IsDefault ? '(Predeterminada)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPrinter && (
            <div className="selected-printer-info">
              <FontAwesomeIcon icon={faCheck} /> Usando: {selectedPrinter}
            </div>
          )}

          <button onClick={() => setShowSettings(false)} className="close-settings">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintButton;
