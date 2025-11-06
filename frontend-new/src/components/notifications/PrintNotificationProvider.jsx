import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, PrinterIcon } from '@heroicons/react/24/outline';

const PrintNotificationContext = createContext();

export const usePrintNotification = () => {
  const context = useContext(PrintNotificationContext);
  if (!context) {
    throw new Error('usePrintNotification must be used within a PrintNotificationProvider');
  }
  return context;
};

export const PrintNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
    
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notifyPrintSuccess = useCallback((message = 'Comanda enviada a impresión') => {
    addNotification({
      type: 'success',
      title: 'Impresión exitosa',
      message,
      icon: CheckCircleIcon
    });
  }, [addNotification]);

  const notifyPrintError = useCallback((message = 'Error al imprimir comanda') => {
    addNotification({
      type: 'error',
      title: 'Error de impresión',
      message,
      icon: ExclamationTriangleIcon
    });
  }, [addNotification]);

  const notifyPrintInfo = useCallback((message) => {
    addNotification({
      type: 'info',
      title: 'Información de impresión',
      message,
      icon: PrinterIcon
    });
  }, [addNotification]);

  return (
    <PrintNotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      notifyPrintSuccess,
      notifyPrintError,
      notifyPrintInfo
    }}>
      {children}
      
      {/* Contenedor de notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          
          return (
            <div
              key={notification.id}
              className={`max-w-sm w-full bg-white shadow-lg rounded-lg border pointer-events-auto ring-1 ring-black ring-opacity-5 transition-all duration-300 ${
                notification.type === 'success' 
                  ? 'border-green-200' 
                  : notification.type === 'error'
                  ? 'border-red-200'
                  : 'border-blue-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 ${
                      notification.type === 'success' 
                        ? 'text-green-600' 
                        : notification.type === 'error'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <span className="sr-only">Cerrar</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PrintNotificationContext.Provider>
  );
};

export default PrintNotificationProvider;