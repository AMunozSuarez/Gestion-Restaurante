import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faCog, faDownload } from '@fortawesome/free-solid-svg-icons';
import axios from '../../services/axiosConfig';
import '../../styles/printComandaAdvanced.css';

const PrintComandaAdvanced = ({ order, buttonText = "Imprimir Comanda", buttonClass = "" }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printMethod, setPrintMethod] = useState('system'); // 'system', 'thermal', 'download'
  const [showConfigSaved, setShowConfigSaved] = useState(false);

  // Cargar configuración guardada al inicializar
  useEffect(() => {
    const savedConfig = localStorage.getItem('printConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setPrintMethod(config.printMethod || 'system');
        setSelectedPrinter(config.selectedPrinter || '');
      } catch (error) {
        console.error('Error cargando configuración de impresión:', error);
      }
    }
  }, []);

  // Cargar impresoras disponibles
  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/print/printers');
      if (response.data.success) {
        setPrinters(response.data.printers);
        
        // Cargar configuración guardada
        const savedConfig = localStorage.getItem('printConfig');
        let savedPrinter = '';
        
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig);
            savedPrinter = config.selectedPrinter || '';
          } catch (error) {
            console.error('Error cargando configuración:', error);
          }
        }
        
        // Seleccionar impresora guardada o la primera disponible
        if (response.data.printers.length > 0) {
          const printerToSelect = savedPrinter && 
            response.data.printers.find(p => p.Name === savedPrinter) 
            ? savedPrinter 
            : response.data.printers[0].Name;
          
          setSelectedPrinter(printerToSelect);
        }
      }
    } catch (error) {
      console.error('Error cargando impresoras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!order) {
      console.error('No hay pedido para imprimir');
      return;
    }

    setIsLoading(true);

    try {
      let response;

      switch (printMethod) {
        case 'thermal':
          response = await axios.post('/print/thermal', { order });
          break;
        case 'download':
          response = await axios.post('/print/pdf', { order }, { responseType: 'blob' });
          // Descargar archivo
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `comanda_${order.orderNumber}.txt`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          break;
        case 'system':
        default:
          if (!selectedPrinter) {
            alert('Por favor selecciona una impresora');
            setIsLoading(false);
            return;
          }
          response = await axios.post('/print/system', { 
            order, 
            printerName: selectedPrinter 
          });
          break;
      }

      if (response && response.data.success) {
        console.log('Impresión exitosa:', response.data.message);
      }
    } catch (error) {
      console.error('Error imprimiendo:', error);
      alert('Error al imprimir la comanda: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectPrint = async () => {
    if (!order) {
      console.error('No hay pedido para imprimir');
      return;
    }

    // Si no hay configuración guardada, mostrar modal para configurar
    if (printMethod === 'system' && !selectedPrinter) {
      setShowPrinterModal(true);
      return;
    }

    setIsLoading(true);

    try {
      let response;

      switch (printMethod) {
        case 'thermal':
          response = await axios.post('/print/thermal', { order });
          break;
        case 'download':
          response = await axios.post('/print/pdf', { order }, { responseType: 'blob' });
          // Descargar archivo
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `comanda_${order.orderNumber}.txt`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          break;
        case 'system':
        default:
          response = await axios.post('/print/system', { 
            order, 
            printerName: selectedPrinter 
          });
          break;
      }

      if (response && response.data.success) {
        console.log('Impresión exitosa:', response.data.message);
      }
    } catch (error) {
      console.error('Error imprimiendo:', error);
      alert('Error al imprimir la comanda: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openPrinterModal = () => {
    setShowPrinterModal(true);
  };

  // Función para guardar configuración
  const saveConfig = (newPrintMethod, newSelectedPrinter) => {
    const config = {
      printMethod: newPrintMethod,
      selectedPrinter: newSelectedPrinter,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('printConfig', JSON.stringify(config));
      console.log('Configuración de impresión guardada:', config);
      
      // Mostrar feedback visual
      setShowConfigSaved(true);
      setTimeout(() => setShowConfigSaved(false), 2000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  // Función para manejar cambio de método de impresión
  const handlePrintMethodChange = (method) => {
    setPrintMethod(method);
    saveConfig(method, selectedPrinter);
  };

  // Función para manejar cambio de impresora
  const handlePrinterChange = (printerName) => {
    setSelectedPrinter(printerName);
    saveConfig(printMethod, printerName);
  };

  // Función para resetear configuración
  const resetConfig = () => {
    localStorage.removeItem('printConfig');
    setPrintMethod('system');
    setSelectedPrinter('');
    setShowConfigSaved(true);
    setTimeout(() => setShowConfigSaved(false), 2000);
    console.log('Configuración de impresión reseteada');
  };

  const closePrinterModal = () => {
    setShowPrinterModal(false);
  };

  if (!order) {
    return null;
  }

  return (
    <div className="print-comanda-advanced-container">
      {/* Botón principal de impresión */}
      <button 
        onClick={handleDirectPrint}
        className={`print-button-advanced ${buttonClass}`}
        title={`Imprimir comanda (${printMethod === 'system' ? 'Sistema' : printMethod === 'thermal' ? 'Térmica' : 'Descarga'})`}
        disabled={isLoading}
      >
        <FontAwesomeIcon icon={faPrint} />
        {isLoading ? 'Imprimiendo...' : buttonText}
        {selectedPrinter && printMethod === 'system' && (
          <span className="printer-indicator" title={`Impresora: ${selectedPrinter}`}>
            📄
          </span>
        )}
      </button>

      {/* Botón de configuración (pequeño) */}
      <button 
        onClick={openPrinterModal}
        className="config-button"
        title="Configurar impresión"
        disabled={isLoading}
      >
        <FontAwesomeIcon icon={faCog} />
      </button>

      {/* Modal de configuración de impresión */}
      {showPrinterModal && (
        <div className="printer-modal-overlay" onClick={closePrinterModal}>
          <div className="printer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="printer-modal-header">
              <h3>Configurar Impresión</h3>
              <button onClick={closePrinterModal} className="close-button">×</button>
            </div>

            <div className="printer-modal-content">
              {/* Mensaje informativo */}
              <div className="config-info-message">
                <p>Configura tu método de impresión preferido. Esta configuración se guardará automáticamente.</p>
              </div>

              {/* Método de impresión */}
              <div className="print-method-section">
                <h4>Método de Impresión</h4>
                <div className="print-method-options">
                  <label className="print-method-option">
                    <input
                      type="radio"
                      name="printMethod"
                      value="system"
                      checked={printMethod === 'system'}
                      onChange={(e) => handlePrintMethodChange(e.target.value)}
                    />
                    <div className="option-content">
                      <FontAwesomeIcon icon={faPrint} />
                      <span>Impresora del Sistema</span>
                    </div>
                  </label>

                  <label className="print-method-option">
                    <input
                      type="radio"
                      name="printMethod"
                      value="thermal"
                      checked={printMethod === 'thermal'}
                      onChange={(e) => handlePrintMethodChange(e.target.value)}
                    />
                    <div className="option-content">
                      <FontAwesomeIcon icon={faPrint} />
                      <span>Impresora Térmica</span>
                    </div>
                  </label>

                  <label className="print-method-option">
                    <input
                      type="radio"
                      name="printMethod"
                      value="download"
                      checked={printMethod === 'download'}
                      onChange={(e) => handlePrintMethodChange(e.target.value)}
                    />
                    <div className="option-content">
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Descargar Comanda</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Selector de impresora (solo para método system) */}
              {printMethod === 'system' && (
                <div className="printer-selection-section">
                  <h4>Seleccionar Impresora</h4>
                  <select
                    value={selectedPrinter}
                    onChange={(e) => handlePrinterChange(e.target.value)}
                    className="printer-select"
                    disabled={isLoading}
                  >
                    <option value="">Selecciona una impresora</option>
                    {printers.map((printer, index) => (
                      <option key={index} value={printer.Name}>
                        {printer.Name} ({printer.DriverName})
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={loadPrinters}
                    className="refresh-printers-button"
                    disabled={isLoading}
                  >
                    <FontAwesomeIcon icon={faCog} />
                    Actualizar Lista
                  </button>
                </div>
              )}

              {/* Información del pedido */}
              <div className="order-info-section">
                <h4>Información del Pedido</h4>
                <div className="order-info">
                  <p><strong>Número:</strong> {order.orderNumber}</p>
                  <p><strong>Cliente:</strong> {order.buyer?.name || 'Sin nombre'}</p>
                  <p><strong>Productos:</strong> {order.foods.length} items</p>
                  <p><strong>Total:</strong> ${order.total.toLocaleString()}</p>
                </div>
              </div>

              {/* Información de configuración guardada */}
              <div className={`config-info-section ${showConfigSaved ? 'config-saved' : ''}`}>
                <small style={{ color: showConfigSaved ? '#28a745' : '#6c757d', fontStyle: 'italic' }}>
                  {showConfigSaved ? '✅ Configuración guardada' : '⚙️ Tu configuración se guarda automáticamente para futuras impresiones'}
                </small>
                <button 
                  onClick={resetConfig}
                  className="reset-config-button"
                  title="Resetear configuración"
                >
                  🔄 Resetear
                </button>
              </div>
            </div>

            <div className="printer-modal-footer">
              <button 
                onClick={closePrinterModal}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button 
                onClick={handlePrint}
                className="print-confirm-button"
                disabled={isLoading || (printMethod === 'system' && !selectedPrinter)}
              >
                <FontAwesomeIcon icon={faPrint} />
                {isLoading ? 'Imprimiendo...' : 'Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintComandaAdvanced; 