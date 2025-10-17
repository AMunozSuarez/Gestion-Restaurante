import React from 'react';
import { useLocalPrint } from '../../hooks/useLocalPrint';
import './PrinterStatus.css';

/**
 * Componente que muestra el estado del servicio de impresión local
 * y permite seleccionar la impresora
 */
const PrinterStatus = ({ showPrinterSelector = true, compact = false }) => {
  const {
    isServiceAvailable,
    isChecking,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    checkService,
    refreshPrinters
  } = useLocalPrint();

  if (compact) {
    return (
      <div className={`printer-status-compact ${isServiceAvailable ? 'available' : 'unavailable'}`}>
        <span className="printer-status-icon">
          {isServiceAvailable ? '🖨️' : '⚠️'}
        </span>
        <span className="printer-status-text">
          {isServiceAvailable ? 'Impresora conectada' : 'Sin impresora'}
        </span>
      </div>
    );
  }

  return (
    <div className="printer-status-container">
      <div className="printer-status-header">
        <h3>Estado de Impresión</h3>
        <button 
          className="btn-refresh"
          onClick={checkService}
          disabled={isChecking}
          title="Verificar servicio de impresión"
        >
          {isChecking ? '🔄' : '↻'} Verificar
        </button>
      </div>

      <div className={`printer-status-card ${isServiceAvailable ? 'available' : 'unavailable'}`}>
        <div className="status-indicator">
          <span className="status-icon">
            {isChecking ? '⏳' : isServiceAvailable ? '✅' : '❌'}
          </span>
          <div className="status-info">
            <p className="status-title">
              {isChecking 
                ? 'Verificando servicio...'
                : isServiceAvailable 
                  ? 'Servicio de impresión disponible'
                  : 'Servicio de impresión no disponible'
              }
            </p>
            {!isServiceAvailable && !isChecking && (
              <p className="status-message">
                Para imprimir tickets, instala la aplicación de impresión local.
                <a 
                  href="/download/printing-service-setup.exe" 
                  className="download-link"
                  download
                >
                  Descargar instalador
                </a>
              </p>
            )}
          </div>
        </div>

        {isServiceAvailable && showPrinterSelector && (
          <div className="printer-selector">
            <label htmlFor="printer-select">Impresora seleccionada:</label>
            <div className="printer-select-group">
              <select
                id="printer-select"
                value={selectedPrinter || ''}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                disabled={printers.length === 0}
              >
                {printers.length === 0 ? (
                  <option value="">No hay impresoras disponibles</option>
                ) : (
                  printers.map((printer) => (
                    <option key={printer} value={printer}>
                      {printer}
                    </option>
                  ))
                )}
              </select>
              <button
                className="btn-refresh-printers"
                onClick={refreshPrinters}
                title="Actualizar lista de impresoras"
              >
                ↻
              </button>
            </div>
            <p className="printer-info">
              {printers.length} impresora{printers.length !== 1 ? 's' : ''} disponible{printers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {isServiceAvailable && (
        <div className="printer-instructions">
          <h4>ℹ️ Información</h4>
          <ul>
            <li>El servicio de impresión está corriendo en segundo plano</li>
            <li>Los tickets se imprimirán automáticamente sin diálogos</li>
            <li>Puedes cambiar la impresora en cualquier momento</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PrinterStatus;
