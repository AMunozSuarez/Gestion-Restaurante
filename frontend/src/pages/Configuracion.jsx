import React, { useState, useEffect } from 'react';
import { 
  PrinterIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import printingService from '../services/printingService';

const Configuracion = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [serviceStatus, setServiceStatus] = useState('checking'); // checking, online, offline
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar estado inicial
  useEffect(() => {
    checkServiceAndLoadPrinters();
    loadSavedPrinters();
  }, []);

  // Verificar servicio y cargar impresoras
  const checkServiceAndLoadPrinters = async () => {
    setLoading(true);
    setServiceStatus('checking');
    
    try {
      // Verificar estado del servicio
      const healthResponse = await printingService.checkHealth();
      
      if (healthResponse.success) {
        setServiceStatus('online');
        // Cargar impresoras
        const printersResponse = await printingService.getPrinters();
        
        if (printersResponse.success) {
          setPrinters(printersResponse.data || []);
        } else {
          setMessage({ 
            type: 'error', 
            text: 'Error al cargar impresoras: ' + printersResponse.error 
          });
        }
      } else {
        setServiceStatus('offline');
        setMessage({ 
          type: 'error', 
          text: 'Servicio de impresión no disponible. Contacte al administrador del sistema.' 
        });
      }
    } catch (error) {
      setServiceStatus('offline');
      setMessage({ 
        type: 'error', 
        text: 'No se puede conectar al servicio de impresión. Contacte al administrador.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar impresoras guardadas
  const loadSavedPrinters = () => {
    const saved = localStorage.getItem('selectedPrinter');
    const defaultSaved = printingService.getDefaultPrinter();
    
    if (saved) {
      setSelectedPrinter(saved);
    }
    if (defaultSaved) {
      setDefaultPrinter(defaultSaved);
    }
  };

  // Guardar impresora seleccionada
  const handlePrinterSelect = (printerName) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('selectedPrinter', printerName);
    setMessage({ 
      type: 'success', 
      text: `Impresora "${printerName}" seleccionada para pruebas` 
    });
  };

  // Establecer impresora predeterminada para comandas
  const handleSetDefaultPrinter = (printerName) => {
    setDefaultPrinter(printerName);
    printingService.setDefaultPrinter(printerName);
    setMessage({ 
      type: 'success', 
      text: `"${printerName}" establecida como impresora predeterminada para comandas de cocina` 
    });
  };

  // Remover impresora predeterminada
  const handleRemoveDefaultPrinter = () => {
    setDefaultPrinter('');
    printingService.removeDefaultPrinter();
    setMessage({ 
      type: 'info', 
      text: 'Impresora predeterminada removida. Las comandas no se imprimirán automáticamente.' 
    });
  };

  // Imprimir página de prueba
  const handleTestPrint = async (printerName = selectedPrinter) => {
    if (!printerName) {
      setMessage({ 
        type: 'error', 
        text: 'Error: No se especificó impresora' 
      });
      return;
    }

    setPrinting(true);
    setMessage({ type: 'info', text: `Enviando página de prueba a ${printerName}...` });

    try {
      const response = await printingService.printTest(printerName);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Página de prueba enviada correctamente a ${printerName}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Error al imprimir: ' + response.error 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error al enviar página de prueba' 
      });
    } finally {
      setPrinting(false);
    }
  };

  // Imprimir comanda de prueba
  const handleTestKitchenOrder = async () => {
    if (!defaultPrinter) {
      setMessage({ 
        type: 'error', 
        text: 'Establece una impresora predeterminada primero' 
      });
      return;
    }

    setPrinting(true);
    setMessage({ type: 'info', text: 'Enviando comanda de prueba...' });

    // Crear orden de prueba con la estructura correcta del backend
    const testOrder = {
      _id: 'TEST-001',
      name: 'Cliente de Prueba', // Cliente sin guardar
      section: 'mostrador',
      foods: [
        {
          food: {
            title: 'Hamburguesa Clásica'
          },
          quantity: 2,
          comment: 'Sin cebolla'
        },
        {
          food: {
            title: 'Papas Fritas'
          },
          quantity: 1,
          comment: ''
        },
        {
          food: {
            title: 'Coca Cola'
          },
          quantity: 2,
          comment: 'Con hielo'
        }
      ],
      comment: 'Orden de prueba para verificar impresión de comandas'
    };

    try {
      const response = await printingService.printKitchenOrder(testOrder);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: 'Comanda de prueba enviada correctamente' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Error al imprimir comanda: ' + response.error 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error al enviar comanda de prueba' 
      });
    } finally {
      setPrinting(false);
    }
  };

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="h-full bg-cream-50 flex flex-col gap-6 p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex-1 overflow-y-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-brown-900 mb-2">
            Configuración General
          </h1>
          <p className="text-brown-600">
            Configura las opciones generales del sistema
          </p>
        </div>

        {/* Mensaje de estado */}
        {message.text && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'info' && <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Estado de impresión automática - Solo mostrar cuando el servicio esté online */}
        {serviceStatus === 'online' && (
          <div className={`p-4 rounded-lg border ${
            defaultPrinter 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                defaultPrinter ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
              <div>
                <p className={`font-medium ${
                  defaultPrinter ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {defaultPrinter 
                    ? 'Impresión automática: ACTIVADA' 
                    : 'Impresión automática: DESACTIVADA'
                  }
                </p>
                <p className={`text-sm ${
                  defaultPrinter ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {defaultPrinter 
                    ? `Las comandas se enviarán automáticamente a "${defaultPrinter}" al crear pedidos`
                    : 'Configure una impresora predeterminada para activar la impresión automática de comandas'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Impresoras */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <PrinterIcon className="w-6 h-6 text-brown-600 mr-3" />
              <h2 className="text-xl font-semibold text-brown-900">
                Configuración de Impresoras
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Estado del servicio */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  serviceStatus === 'online' 
                    ? 'bg-green-500' 
                    : serviceStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500 animate-pulse'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {serviceStatus === 'online' 
                    ? 'Servicio conectado' 
                    : serviceStatus === 'offline'
                    ? 'Servicio desconectado'
                    : 'Verificando...'}
                </span>
              </div>

              {/* Botón actualizar */}
              <button
                onClick={checkServiceAndLoadPrinters}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Lista de impresoras */}
          {serviceStatus === 'online' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Impresoras disponibles:
                </label>
                
                {printers.length > 0 ? (
                  <div className="grid gap-3">
                    {printers.map((printer) => {
                      // Manejar tanto el formato string como objeto
                      const printerName = typeof printer === 'string' ? printer : printer.PrinterName;
                      const printerStatus = typeof printer === 'object' ? printer.Status : 'Available';
                      const isSystemDefault = typeof printer === 'object' ? printer.IsDefault : false;
                      const isAppDefault = defaultPrinter === printerName;
                      
                      return (
                        <div
                          key={printerName}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <PrinterIcon className="w-5 h-5 text-gray-500 mr-3" />
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">{printerName}</span>
                                  {isSystemDefault && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                      Predeterminada Sistema
                                    </span>
                                  )}
                                  {isAppDefault && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                      Comandas Automáticas
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">Estado: {printerStatus}</div>
                              </div>
                            </div>
                            
                            {/* Botones de acción */}
                            <div className="flex items-center space-x-2">
                              {/* Botón de prueba */}
                              <button
                                onClick={() => handleTestPrint(printerName)}
                                disabled={printing}
                                className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <PrinterIcon className="w-3 h-3 mr-1" />
                                {printing && selectedPrinter === printerName ? 'Imprimiendo...' : 'Prueba'}
                              </button>
                              
                              {/* Botón establecer como predeterminada */}
                              {!isAppDefault ? (
                                <button
                                  onClick={() => handleSetDefaultPrinter(printerName)}
                                  className="inline-flex items-center px-3 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  Establecer como predeterminada
                                </button>
                              ) : (
                                <button
                                  onClick={handleRemoveDefaultPrinter}
                                  className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  Quitar predeterminada
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PrinterIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron impresoras</p>
                    <button
                      onClick={checkServiceAndLoadPrinters}
                      className="mt-2 text-blue-600 hover:text-blue-500"
                    >
                      Intentar de nuevo
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de comanda de prueba */}
              {defaultPrinter && (
                <div className="border-t pt-4">
                  <button
                    onClick={handleTestKitchenOrder}
                    disabled={printing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <PrinterIcon className="w-4 h-4 mr-2" />
                    {printing ? 'Imprimiendo...' : 'Probar comanda de cocina'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Envía una comanda de prueba a la impresora predeterminada: <strong>{defaultPrinter}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                No se puede conectar al servicio de impresión
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Es necesario instalar el servicio de impresión para poder usar las impresoras.
              </p>
              <a
                href="https://github.com/AMunozSuarez/Gestion-Restaurante/releases/download/V1.0/RestaurantPrintingServiceInstaller.exe"
                download="RestaurantPrintingServiceInstaller.exe"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Servicio de Impresión
              </a>
              <p className="text-xs text-gray-400 mt-2">
                Después de descargar, ejecute el instalador, actualice y listo!
              </p>
            </div>
          )}
        </div>

        {/* Información de uso */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <CogIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Cómo usar las impresoras:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>Prueba:</strong> Verifica que la impresora funcione correctamente</li>
                <li><strong>Predeterminada:</strong> Se usará automáticamente para imprimir comandas de cocina</li>
                <li>Cuando configures una impresora predeterminada, las comandas se imprimirán automáticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;