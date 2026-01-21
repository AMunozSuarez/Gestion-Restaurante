import React, { useState, useEffect } from 'react';
import { 
  PrinterIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CalendarIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import printingService from '../services/printingService';
import * as subscriptionService from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';

const Configuracion = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('printers'); // 'printers' o 'subscription'
  
  // Estados para impresoras
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [serviceStatus, setServiceStatus] = useState('checking'); // checking, online, offline
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados para suscripción
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    if (activeTab === 'printers') {
      checkServiceAndLoadPrinters();
      loadSavedPrinters();
    } else if (activeTab === 'subscription') {
      loadSubscription();
    }
  }, [activeTab]);

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
  // ============ FUNCIONES PARA SUSCRIPCIÓN ============
  
  // Cargar información de la suscripción
  const loadSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const response = await subscriptionService.getCurrentSubscription();
      if (response.success) {
        setSubscription(response.data);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Error al cargar suscripción: ' + response.message 
        });
      }
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al cargar información de suscripción' 
      });
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Cancelar suscripción
  const handleCancelSubscription = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso al finalizar el período actual.')) {
      return;
    }

    setCancelingSubscription(true);
    try {
      const response = await subscriptionService.cancelSubscription();
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: 'Suscripción cancelada exitosamente' 
        });
        loadSubscription();
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Error al cancelar: ' + response.message 
        });
      }
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al cancelar la suscripción' 
      });
    } finally {
      setCancelingSubscription(false);
    }
  };

  // Navegar a planes
  const handleChangePlan = () => {
    navigate('/subscription/plans');
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener estado visual
  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', text: 'Activa' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expirada' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelada' },
      trial: { color: 'bg-blue-100 text-blue-800', text: 'Prueba' },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('printers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'printers'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <PrinterIcon className="w-5 h-5 mr-2" />
                Impresoras
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'subscription'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CreditCardIcon className="w-5 h-5 mr-2" />
                Suscripción
              </div>
            </button>
          </nav>
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

        {/* Contenido según pestaña activa */}
        {activeTab === 'printers' && (
          <>
            {/* Estado de impresión automática */}
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
          </>
        )}

        {/* Contenido de Suscripción */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {loadingSubscription ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="w-12 h-12 text-green-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Cargando información de suscripción...</p>
              </div>
            ) : subscription ? (
              <>
                {/* Card principal de suscripción */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          Plan {subscription.plan === 'trial' ? 'Prueba' : 
                               subscription.plan === 'monthly' ? 'Mensual' : 
                               subscription.plan === 'quarterly' ? 'Trimestral' : 'Anual'}
                        </h2>
                        <p className="text-green-100">
                          Gestión completa de tu restaurante
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold ${
                          getStatusBadge(subscription.status).color
                        }`}>
                          {getStatusBadge(subscription.status).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Información de fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start space-x-3">
                        <CalendarIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Fecha de inicio</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(subscription.startDate)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <CalendarIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Fecha de vencimiento</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Días restantes</p>
                          <p className="font-medium text-gray-900">
                            {Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} días
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Características del plan */}
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Características incluidas:</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Pedidos ilimitados
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Empleados ilimitados
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Gestión de productos
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Reportes y estadísticas
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Gestión de cajas
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Soporte técnico
                        </li>
                      </ul>
                    </div>

                    {/* Acciones */}
                    <div className="border-t pt-4 flex flex-wrap gap-3">
                      {subscription.status === 'active' && subscription.plan !== 'trial' && (
                        <>
                          <button
                            onClick={handleChangePlan}
                            className="flex-1 min-w-[200px] inline-flex justify-center items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            <CreditCardIcon className="w-4 h-4 mr-2" />
                            Cambiar Plan
                          </button>
                          
                          <button
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            className="flex-1 min-w-[200px] inline-flex justify-center items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                          >
                            <XCircleIcon className="w-4 h-4 mr-2" />
                            {cancelingSubscription ? 'Cancelando...' : 'Cancelar Suscripción'}
                          </button>
                        </>
                      )}

                      {subscription.plan === 'trial' && (
                        <button
                          onClick={handleChangePlan}
                          className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <CreditCardIcon className="w-5 h-5 mr-2" />
                          Actualizar a Plan de Pago
                        </button>
                      )}

                      {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                        <button
                          onClick={handleChangePlan}
                          className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <CreditCardIcon className="w-5 h-5 mr-2" />
                          Renovar Suscripción
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Historial de pagos */}
                {subscription.paymentHistory && subscription.paymentHistory.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Historial de Pagos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {subscription.paymentHistory.slice(0, 5).map((payment, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(payment.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                ${payment.amount?.toLocaleString('es-CL')} CLP
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {payment.method === 'mercadopago' ? 'MercadoPago' : payment.method}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.status === 'approved' 
                                    ? 'bg-green-100 text-green-800'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {payment.status === 'approved' ? 'Aprobado' : 
                                   payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Alertas según estado */}
                {subscription.status === 'expired' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 mb-1">
                          Suscripción Expirada
                        </h4>
                        <p className="text-sm text-red-700">
                          Tu suscripción ha expirado. Renueva ahora para seguir usando el sistema sin interrupciones.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {subscription.status === 'active' && subscription.plan === 'trial' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">
                          Período de Prueba Activo
                        </h4>
                        <p className="text-sm text-blue-700">
                          Estás usando el período de prueba gratuito. Actualiza a un plan de pago para continuar después de {Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))} días.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay suscripción activa
                </h3>
                <p className="text-gray-600 mb-6">
                  Suscríbete para comenzar a usar todas las funcionalidades del sistema
                </p>
                <button
                  onClick={handleChangePlan}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <CreditCardIcon className="w-5 h-5 mr-2" />
                  Ver Planes Disponibles
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;