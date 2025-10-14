import React, { useEffect, useState } from 'react';
import {
  CheckPrintServiceStatus,
  GetAvailablePrinters,
  PrintOrderTicket,
  PrintKitchenTicket
} from '../services/printService';

/**
 * Componente de prueba para el servicio de impresión
 * Puedes usarlo en tus páginas de órdenes o como componente independiente
 */
const PrintTestComponent = ({ orderId }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'

  const CheckService = async () => {
    setLoading(true);
    setMessage('Verificando servicio de impresión...');
    setMessageType('info');

    try {
      const statusResponse = await CheckPrintServiceStatus();
      
      if (statusResponse.available) {
        setServiceAvailable(true);
        setMessage('✅ Servicio de impresión disponible');
        setMessageType('success');
        
        // Cargar impresoras
        await LoadPrinters();
      } else {
        setServiceAvailable(false);
        setMessage('⚠️ Servicio de impresión no disponible. Asegúrate de que esté corriendo.');
        setMessageType('error');
      }
    } catch (error) {
      setServiceAvailable(false);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const LoadPrinters = async () => {
    try {
      const response = await GetAvailablePrinters();
      const printersList = response.printers || [];
      setPrinters(printersList);
      
      if (printersList.length > 0) {
        // Usar PrinterName (PascalCase) que viene del servicio de C#
        setSelectedPrinter(printersList[0].PrinterName || printersList[0].printerName);
        setMessage(`✅ Se encontraron ${printersList.length} impresora(s)`);
        setMessageType('success');
      } else {
        setMessage('⚠️ No se encontraron impresoras');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error cargando impresoras: ${error.message}`);
      setMessageType('error');
    }
  };

  useEffect(() => {
    CheckService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const HandlePrintOrder = async () => {
    if (!orderId) {
      setMessage('❌ No hay orden para imprimir');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Imprimiendo ticket...');
    setMessageType('info');

    try {
      const result = await PrintOrderTicket(orderId, selectedPrinter);
      setMessage(`✅ ${result.message || 'Ticket impreso correctamente'}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error completo:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setMessage(`❌ Error al imprimir: ${errorMsg}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const HandlePrintKitchen = async () => {
    if (!orderId) {
      setMessage('❌ No hay orden para imprimir');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Imprimiendo ticket de cocina...');
    setMessageType('info');

    try {
      const result = await PrintKitchenTicket(orderId, selectedPrinter);
      setMessage(`✅ ${result.message || 'Ticket de cocina impreso correctamente'}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error completo:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      setMessage(`❌ Error al imprimir: ${errorMsg}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const GetMessageStyle = () => {
    const baseStyle = {
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    };

    switch (messageType) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
      case 'info':
        return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🖨️ Servicio de Impresión
      </h2>

      {message && (
        <div style={GetMessageStyle()}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={CheckService}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '14px'
          }}
        >
          {loading ? '⏳ Cargando...' : '🔄 Verificar Servicio'}
        </button>
      </div>

      {serviceAvailable && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
              Seleccionar Impresora:
            </label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              {printers.map((printer, index) => {
                // Soportar tanto PrinterName (del servicio C#) como printerName (del backend)
                const printerName = printer.PrinterName || printer.printerName || `Impresora ${index + 1}`;
                const isDefault = printer.IsDefault || printer.isDefault || false;
                
                return (
                  <option key={`${printerName}-${index}`} value={printerName}>
                    {printerName} {isDefault ? '(Predeterminada)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={HandlePrintOrder}
              disabled={loading || !orderId}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !orderId ? 'not-allowed' : 'pointer',
                opacity: loading || !orderId ? 0.6 : 1,
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🎫 Imprimir Ticket Cliente
            </button>

            <button
              onClick={HandlePrintKitchen}
              disabled={loading || !orderId}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !orderId ? 'not-allowed' : 'pointer',
                opacity: loading || !orderId ? 0.6 : 1,
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              👨‍🍳 Imprimir Ticket Cocina
            </button>
          </div>

          {!orderId && (
            <p style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>
              ℹ️ Proporciona un <code>orderId</code> para habilitar los botones de impresión
            </p>
          )}
        </>
      )}

      {!serviceAvailable && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#856404' }}>⚠️ Servicio No Disponible</h3>
          <p style={{ color: '#856404', lineHeight: '1.6' }}>
            El servicio de impresión no está disponible. Para usarlo:
          </p>
          <ol style={{ color: '#856404', lineHeight: '1.8' }}>
            <li>Asegúrate de que el servicio esté instalado</li>
            <li>Verifica que esté corriendo en <code>http://localhost:8088</code></li>
            <li>Revisa el backend en <code>http://localhost:3001/api/print/status</code></li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PrintTestComponent;
