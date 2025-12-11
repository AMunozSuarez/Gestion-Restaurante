import React from 'react';
import { useCashRegister } from '../hooks/useCashRegister';
import { useCashRegisters } from '../hooks/useCashRegisters';
import { useCashRegisterSales } from '../hooks/useCashRegisterSales';
import { PlusIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import VentaDetailModal from '../components/common/VentaDetailModal';
import printingService from '../services/printingService';
import { useProducts } from '../hooks/useProducts';

const CashRegister = () => {
  // Estados principales
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedCashRegister, setSelectedCashRegister] = React.useState(null);
  const [notification, setNotification] = React.useState(null);
  
  // Estados para modal de detalle de pedido
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = React.useState(false);
  
  // Estados para crear caja
  const [initialAmount, setInitialAmount] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  
  // Estados para cerrar caja
  const [officialIncome, setOfficialIncome] = React.useState({
    Efectivo: '',
    Transferencia: '',
    Tarjeta: ''
  });
  const [comment, setComment] = React.useState('');
  const [isClosing, setIsClosing] = React.useState(false);

  // Estados para colapsar paneles
  const [currentCashCollapsed, setCurrentCashCollapsed] = React.useState(false);

  // Hooks
  const { 
    cashRegister: currentCashRegister, 
    isOpen, 
    isLoading: currentLoading, 
    openCashRegister, 
    closeCashRegister 
  } = useCashRegister();
  
  const { 
    cashRegisters, 
    isLoading: historyLoading, 
    error: historyError, 
    refetch 
  } = useCashRegisters();

  // Hook para obtener ventas de la caja activa
  const {
    sales: currentCashSales,
    statistics: currentCashStatistics,
    isLoading: salesLoading,
    error: salesError,
    refetch: refetchSales
  } = useCashRegisterSales(null, { activeOnly: isOpen });

  // Hook para obtener ventas de caja seleccionada
  const {
    sales: selectedCashSales,
    statistics: selectedCashStatistics,
    isLoading: selectedSalesLoading,
    refetch: refetchSelectedSales
  } = useCashRegisterSales(selectedCashRegister?._id);

  // Hook para obtener productos
  const { products, isLoading: productsLoading } = useProducts();

  // Efecto para refrescar ventas cuando se monta el componente
  React.useEffect(() => {
    // Refrescar ventas de caja activa si hay una caja abierta
    if (isOpen) {
      refetchSales();
    }
    // Refrescar ventas de caja seleccionada si hay una seleccionada
    if (selectedCashRegister) {
      refetchSelectedSales();
    }
  }, []); // Se ejecuta solo al montar el componente

  // Efecto para refrescar cuando la página se hace visible (al cambiar de pestaña)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // La página se hizo visible, refrescar datos
        if (isOpen) {
          refetchSales();
        }
        if (selectedCashRegister) {
          refetchSelectedSales();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, selectedCashRegister, refetchSales, refetchSelectedSales]);

  // Funciones de utilidad
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Función para obtener el total del sistema de una caja específica
  const getSystemTotalForCashRegister = (cashRegister) => {
    if (!cashRegister) return 0;
    
    // Para la caja actual abierta
    if (cashRegister.status === 'Abierta' && isOpen && cashRegister._id === currentCashRegister?._id) {
      // Prioridad 1: Estadísticas en tiempo real del hook
      if (currentCashStatistics?.systemTotal !== undefined && currentCashStatistics.systemTotal !== null) {
        return currentCashStatistics.systemTotal;
      }
      // Prioridad 2: Calcular desde las ventas directamente
      if (currentCashSales && currentCashSales.length > 0) {
        return calculateSystemTotal(currentCashSales);
      }
      // Prioridad 3: Usar datos del backend
      return cashRegister.amountSystem || 0;
    }
    
    // Para la caja seleccionada
    if (cashRegister._id === selectedCashRegister?._id) {
      // Prioridad 1: Estadísticas específicas del hook
      if (selectedCashStatistics?.systemTotal !== undefined && selectedCashStatistics.systemTotal !== null) {
        return selectedCashStatistics.systemTotal;
      }
      // Prioridad 2: Calcular desde las ventas directamente
      if (selectedCashSales && selectedCashSales.length > 0) {
        return calculateSystemTotal(selectedCashSales);
      }
    }
    
    // Para todas las demás cajas, usar datos del backend
    return cashRegister.amountSystem || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const calculateSystemTotal = (orders) => {
    return orders?.reduce((total, order) => total + (order.total || 0), 0) || 0;
  };

  const calculateOfficialTotal = (income) => {
    if (!income || typeof income !== 'object') return 0;
    return Object.values(income).reduce((total, amount) => total + (parseFloat(amount) || 0), 0);
  };

  const calculateSystemTotalsByPaymentMethod = (orders) => {
    if (!orders || !Array.isArray(orders)) return {};
    
    const totals = {};
    
    orders.forEach((order) => {
      const orderTotal = order.total || 0;
      
      // PRIORIDAD 1: Usar paymentMethods con montos reales si está disponible
      if (order.paymentMethods && Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
        // Verificar si la suma de paymentMethods coincide con el total de la orden
        const sumPaymentMethods = order.paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
        const tolerance = 1; // Tolerancia de 1 peso para redondeo
        
        // Si hay discrepancia significativa, ajustar proporcionalmente
        if (Math.abs(sumPaymentMethods - orderTotal) > tolerance) {
          // Ajustar proporcionalmente cada método de pago al total actual
          const ratio = orderTotal / (sumPaymentMethods || 1);
          order.paymentMethods.forEach(payment => {
            const method = payment.method || 'Sin especificar';
            const adjustedAmount = (payment.amount || 0) * ratio;
            totals[method] = (totals[method] || 0) + adjustedAmount;
          });
        } else {
          // No hay discrepancia, usar valores originales
          order.paymentMethods.forEach(payment => {
            const method = payment.method || 'Sin especificar';
            const amount = payment.amount || 0;
            totals[method] = (totals[method] || 0) + amount;
          });
        }
      }
      // PRIORIDAD 2: Para pedidos antiguos con un solo método, usar el total del pedido
      else if (order.paymentMethod || order.payment) {
        const method = order.paymentMethod || order.payment || 'Sin especificar';
        totals[method] = (totals[method] || 0) + orderTotal;
      }
      // PRIORIDAD 3: Si no hay método de pago definido, asumir efectivo
      else {
        totals['Efectivo'] = (totals['Efectivo'] || 0) + orderTotal;
      }
    });
    
    return totals;
  };

  const calculateDeliveryTotal = (orders) => {
    if (!orders || !Array.isArray(orders)) return 0;
    return orders.reduce((total, order) => {
      if (order.section === 'delivery' && order.deliveryCost) {
        return total + (order.deliveryCost || 0);
      }
      return total;
    }, 0);
  };

  const getDifference = (systemTotal, officialTotal) => {
    return officialTotal - systemTotal;
  };

  // Manejadores de eventos
  const handleCreateCash = async () => {
    if (!initialAmount || parseFloat(initialAmount) < 0) {
      setNotification('Por favor ingrese un monto inicial válido');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setIsCreating(true);
      const result = await openCashRegister(initialAmount);
      
      if (result.success) {
        setShowCreateModal(false);
        setInitialAmount('');
        refetch();
        setNotification('Caja abierta exitosamente');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification(result.error || 'Error al abrir la caja');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification('Error al abrir la caja');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCash = async () => {
    try {
      setIsClosing(true);
      const result = await closeCashRegister({
        officialIncome,
        comment
      });
      
      if (result.success) {
        setOfficialIncome({ Efectivo: '', Transferencia: '', Tarjeta: '' });
        setComment('');
        setSelectedCashRegister(null); // Cerrar el panel lateral
        refetch();
        setNotification('Caja cerrada exitosamente');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification(result.error || 'Error al cerrar la caja');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification('Error al cerrar la caja');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsClosing(false);
    }
  };

  const handleViewDetail = (cashRegister) => {
    setSelectedCashRegister(selectedCashRegister?._id === cashRegister._id ? null : cashRegister);
  };

  const handleIncomeChange = (method, value) => {
    setOfficialIncome(prev => ({
      ...prev,
      [method]: value
    }));
  };

  // Manejar detalle de pedido
  const handleViewOrderDetail = (order) => {
    // Las órdenes ya vienen con la estructura correcta del backend
    // Solo necesitamos asegurar compatibilidad con el modal si es necesario
    const adaptedOrder = {
      ...order,
      // Asegurar que los campos estén presentes para el modal
      name: order.name || order.buyer?.name || 'Cliente anónimo',
      buyer: order.buyer || {
        name: order.name || 'Cliente anónimo'
      }
    };
    
    setSelectedOrder(adaptedOrder);
    setShowOrderDetailModal(true);
  };

  // Manejar impresión de reporte de caja
  const handlePrintCashRegisterReport = async (cashRegister) => {
    try {
      const result = await printingService.printCashRegisterReport(cashRegister);
      if (result.success) {
        setNotification('Reporte de caja impreso exitosamente');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification(`Error al imprimir reporte: ${result.error}`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error al imprimir reporte de caja:', error);
      setNotification('Error al imprimir reporte. Verifique que el servicio de impresión esté funcionando.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Mostrar loading
  if (currentLoading || historyLoading) {
    return (
      <div className="h-full bg-professional flex items-center justify-center">
        <div className="text-center">
          <div className="loading-professional mx-auto mb-4"></div>
          <p className="text-professional-body">Cargando información de cajas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-professional flex gap-4 p-2 lg:p-4 overflow-hidden">
      {/* Contenido Principal */}
      <div className={`${selectedCashRegister ? 'w-2/3' : 'w-full'} flex flex-col gap-2 lg:gap-4 transition-all duration-300`}>
        {/* Header - Más compacto */}
        <div className="card-professional p-3 lg:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-amber-800">Gestión de Cajas</h1>
              <p className="text-sm text-gray-600 mt-1 hidden lg:block">Administra las cajas registradoras del restaurante</p>
            </div>
            <div className="flex gap-3">
              {!isOpen && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-professional-secondary flex items-center gap-2 text-sm px-3 py-2"
                >
                  <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                  Abrir Caja
                </button>
              )}
              {isOpen && (
                <button
                  onClick={() => setSelectedCashRegister(currentCashRegister)}
                  className="btn-professional-primary flex items-center gap-2 text-sm px-3 py-2"
                >
                  Cerrar Caja
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Caja Actual - Colapsable */}
        {isOpen && currentCashRegister && (
          <div className="card-professional p-2 lg:p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm lg:text-base font-semibold text-amber-800">Caja Actual</h2>
              <button
                onClick={() => setCurrentCashCollapsed(!currentCashCollapsed)}
                className="text-sm w-6 h-6 flex items-center justify-center rounded border border-amber-300 text-amber-700 hover:bg-amber-50 font-mono"
              >
                {currentCashCollapsed ? '+' : '−'}
              </button>
            </div>
            
            {!currentCashCollapsed && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded border border-green-200">
                  <p className="text-xs text-green-700 font-medium">Estado</p>
                  <p className="text-xs lg:text-sm font-bold text-green-800">Abierta</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">Monto Inicial</p>
                  <p className="text-xs lg:text-sm font-bold text-blue-800">{formatCurrency(currentCashRegister.initialBalance)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 rounded border border-purple-200">
                  <p className="text-xs text-purple-700 font-medium">Fecha Apertura</p>
                  <p className="text-xs lg:text-sm font-bold text-purple-800">{formatDate(currentCashRegister.dateOpened)}</p>
                </div>
                <div className="total-highlight p-2">
                  <p className="text-xs font-medium">Total Sistema</p>
                  <p className="text-xs lg:text-sm font-bold">
                    {formatCurrency(getSystemTotalForCashRegister(currentCashRegister))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial de Cajas */}
        <div className="card-professional flex-1 flex flex-col overflow-hidden">
          
          {historyError && (
            <div className="p-3 lg:p-6 text-center">
              <p className="text-red-600">Error al cargar el historial: {historyError}</p>
              <button 
                onClick={refetch}
                className="mt-2 btn-professional-outline"
              >
                Intentar nuevamente
              </button>
            </div>
          )}

          {!historyError && cashRegisters.length === 0 && (
            <div className="p-3 lg:p-6 text-center">
              <p className="text-professional-body">No hay cajas registradas</p>
            </div>
          )}

          {!historyError && cashRegisters.length > 0 && (
            <div className="flex-1 overflow-auto scrollbar-professional">
              {/* Vista de tabla para pantallas grandes */}
              <div className="hidden lg:block">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Fecha Apertura
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Fecha Cierre
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Monto Inicial
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Total Sistema
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Total Oficial
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Diferencia
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white bg-opacity-50 divide-y divide-amber-100">
                    {[...cashRegisters]
                      .sort((a, b) => new Date(b.dateOpened) - new Date(a.dateOpened))
                      .map((cashRegister) => {
                      const systemTotal = getSystemTotalForCashRegister(cashRegister);
                      const officialTotal = calculateOfficialTotal(cashRegister.officialIncome);
                      const difference = getDifference(systemTotal, officialTotal);
                      
                      return (
                        <tr 
                          key={cashRegister._id} 
                          className={`hover:bg-amber-50 hover:bg-opacity-50 transition-colors cursor-pointer ${
                            selectedCashRegister?._id === cashRegister._id ? 'bg-amber-100 bg-opacity-70' : ''
                          }`}
                          onClick={() => handleViewDetail(cashRegister)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cashRegister.status === 'Abierta' 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {cashRegister.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(cashRegister.dateOpened)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(cashRegister.dateClosed)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {formatCurrency(cashRegister.initialBalance)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {formatCurrency(systemTotal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {formatCurrency(officialTotal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`font-bold ${
                              difference > 0 ? 'text-green-700' : 
                              difference < 0 ? 'text-red-700' : 'text-gray-600'
                            }`}>
                              {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(cashRegister);
                              }}
                              className="text-amber-600 hover:text-amber-800 font-medium"
                            >
                              {selectedCashRegister?._id === cashRegister._id ? 'Ocultar' : 'Ver Detalle'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista de tarjetas para pantallas medianas y pequeñas */}
              <div className="lg:hidden space-y-3 p-3">
                {[...cashRegisters]
                  .sort((a, b) => new Date(b.dateOpened) - new Date(a.dateOpened))
                  .map((cashRegister) => {
                  const systemTotal = getSystemTotalForCashRegister(cashRegister);
                  const officialTotal = calculateOfficialTotal(cashRegister.officialIncome);
                  const difference = getDifference(systemTotal, officialTotal);
                  
                  return (
                    <div 
                      key={cashRegister._id} 
                      className={`bg-white bg-opacity-80 rounded-lg border border-amber-200 p-3 hover:bg-opacity-100 transition-all cursor-pointer shadow-sm ${
                        selectedCashRegister?._id === cashRegister._id ? 'bg-amber-50 border-amber-300' : ''
                      }`}
                      onClick={() => handleViewDetail(cashRegister)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cashRegister.status === 'Abierta' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {cashRegister.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(cashRegister.dateOpened)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Sistema:</p>
                          <p className="font-semibold text-amber-700">
                            {formatCurrency(systemTotal)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-gray-600">Inicial:</p>
                          <p className="text-sm font-medium">{formatCurrency(cashRegister.initialBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Oficial:</p>
                          <p className="text-sm font-medium">{formatCurrency(officialTotal)}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-600">Diferencia:</p>
                          <span className={`text-sm font-bold ${
                            difference > 0 ? 'text-green-700' : 
                            difference < 0 ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                          </span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(cashRegister);
                          }}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium bg-amber-50 px-2 py-1 rounded"
                        >
                          {selectedCashRegister?._id === cashRegister._id ? 'Ocultar' : 'Ver Detalle'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel de Detalle Lateral */}
      {selectedCashRegister && (
        <div className="w-1/3 card-professional p-3 lg:p-6 overflow-y-auto scrollbar-professional">
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <h3 className="text-sm lg:text-base font-semibold text-amber-800">
              Detalle de Caja
            </h3>
            <div className="flex items-center gap-2">
              {selectedCashRegister.status === 'Cerrada' && (
                <button
                  onClick={() => handlePrintCashRegisterReport(selectedCashRegister)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                  title="Imprimir reporte de caja"
                >
                  <PrinterIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              )}
              <button
                onClick={() => setSelectedCashRegister(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>

          {/* Información General */}
          <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-4 lg:mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 font-medium">Estado</p>
              <p className="text-sm font-bold text-gray-800">{selectedCashRegister.status}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 font-medium">Monto Inicial</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(selectedCashRegister.initialBalance)}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200 col-span-2">
              <p className="text-xs text-gray-700 font-medium">Fecha Apertura</p>
              <p className="text-sm font-bold text-gray-800">{formatDate(selectedCashRegister.dateOpened)}</p>
            </div>
          </div>

          {selectedCashRegister.status === 'Cerrada' && (
            <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-4 lg:mb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200 col-span-2">
                <p className="text-xs text-gray-700 font-medium">Fecha Cierre</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(selectedCashRegister.dateClosed)}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700 font-medium">Total Sistema</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(getSystemTotalForCashRegister(selectedCashRegister))}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 lg:p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700 font-medium">Total Oficial</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(calculateOfficialTotal(selectedCashRegister.officialIncome))}
                </p>
              </div>
              <div className={`p-2 lg:p-3 rounded-lg border col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200`}>
                <p className="text-xs text-gray-700 font-medium">
                  Diferencia
                </p>
                <p className={`text-sm font-bold ${
                  getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(selectedCashRegister.officialIncome)) >= 0
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(selectedCashRegister.officialIncome)) >= 0 ? '+' : ''}
                  {formatCurrency(getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(selectedCashRegister.officialIncome)))}
                </p>
              </div>
            </div>
          )}

          {/* Comentarios */}
          {selectedCashRegister.comment && (
            <div className="mb-6">
              <h4 className="text-professional-subtitle mb-3">Comentario</h4>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <p className="text-professional-body text-sm">{selectedCashRegister.comment}</p>
              </div>
            </div>
          )}

          {/* Totales por Método de Pago del Sistema */}
          <div className="mb-6">
            <h4 className="text-professional-subtitle mb-3">Totales del Sistema por Método de Pago</h4>
            <div className="space-y-2">
              {Object.entries(calculateSystemTotalsByPaymentMethod(selectedCashSales || [])).map(([method, amount]) => (
                <div key={method} className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">{method}</p>
                  <p className="text-sm font-bold text-blue-800">{formatCurrency(amount)}</p>
                </div>
              ))}
              {Object.keys(calculateSystemTotalsByPaymentMethod(selectedCashSales || [])).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-professional-body text-sm">No hay totales por método de pago</p>
                </div>
              )}
            </div>
          </div>

          {/* Monto Total de Delivery */}
          <div className="mb-6">
            <h4 className="text-professional-subtitle mb-3">Ingresos por Delivery</h4>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Monto Total de Delivery</p>
                  <p className="text-sm text-orange-600">Costo de envío total</p>
                </div>
                <p className="text-lg font-bold text-orange-800">
                  {formatCurrency(calculateDeliveryTotal(selectedCashSales || []))}
                </p>
              </div>
              {calculateDeliveryTotal(selectedCashSales || []) === 0 && (
                <div className="text-center py-2">
                  <p className="text-professional-body text-sm">No hay ingresos por delivery</p>
                </div>
              )}
            </div>
          </div>

          {/* Ingresos Oficiales */}
          {selectedCashRegister.status === 'Cerrada' && selectedCashRegister.officialIncome && (
            <div className="mb-6">
              <h4 className="text-professional-subtitle mb-3">Ingresos Oficiales Declarados</h4>
              <div className="space-y-2">
                {Object.entries(selectedCashRegister.officialIncome).map(([method, amount]) => (
                  <div key={method} className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-amber-700 font-medium">{method}</p>
                        <p className="text-sm font-bold text-amber-800">{formatCurrency(amount)}</p>
                      </div>
                      {/* Comparación con el sistema */}
                      {calculateSystemTotalsByPaymentMethod(selectedCashSales || [])[method] && (
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Sistema:</p>
                          <p className="text-xs font-medium text-gray-700">
                            {formatCurrency(calculateSystemTotalsByPaymentMethod(selectedCashSales || [])[method])}
                          </p>
                          <p className={`text-xs font-bold ${
                            (parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashSales || [])[method]) >= 0 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {(parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashSales || [])[method]) >= 0 ? '+' : ''}
                            {formatCurrency(parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashSales || [])[method])}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cerrar Caja - Solo para cajas abiertas */}
          {selectedCashRegister.status === 'Abierta' && (
            <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
              <h4 className="text-professional-subtitle mb-3 text-amber-800">Cerrar Caja</h4>
              
              {/* Ingresos Oficiales */}
              <div className="space-y-2 mb-4">
                <label className="block text-xs font-medium text-amber-700">
                  Ingresos Oficiales por Método de Pago
                </label>
                {Object.keys(officialIncome).map((method) => (
                  <div key={method} className="bg-white p-2 rounded-lg border border-amber-300">
                    <label className="block text-xs font-medium text-amber-700 mb-1">{method}</label>
                    <input
                      type="number"
                      value={officialIncome[method]}
                      onChange={(e) => handleIncomeChange(method, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-amber-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                ))}
              </div>

              {/* Total Oficial y Diferencia */}
              <div className="bg-white p-2 rounded-lg border border-amber-300 mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-amber-700">Total Oficial:</span>
                  <span className="text-sm font-bold text-amber-800">
                    {formatCurrency(calculateOfficialTotal(officialIncome))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-amber-700">Diferencia:</span>
                  <span className={`text-xs font-bold ${
                    getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(officialIncome)) >= 0 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(officialIncome)) >= 0 ? '+' : ''}
                    {formatCurrency(getDifference(getSystemTotalForCashRegister(selectedCashRegister), calculateOfficialTotal(officialIncome)))}
                  </span>
                </div>
              </div>

              {/* Comentarios */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-amber-700 mb-1">
                  Comentarios (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-amber-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-transparent"
                  rows="3"
                  placeholder="Observaciones sobre el cierre de caja..."
                />
              </div>

              {/* Botones */}
              <div className="space-y-2">
                <button
                  onClick={handleCloseCash}
                  disabled={isClosing}
                  className="w-full btn-professional-primary text-xs py-2"
                >
                  {isClosing ? 'Cerrando...' : 'Cerrar Caja'}
                </button>
              </div>
            </div>
          )}

          {/* Pedidos */}
          <div className="mb-6">
            <h4 className="text-professional-subtitle mb-4">
              Pedidos ({selectedCashSales?.length || 0})
            </h4>
            
            {selectedCashSales && selectedCashSales.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-professional">
                {selectedCashSales.map((order, index) => (
                  <div 
                    key={index} 
                    className="bg-white bg-opacity-50 p-3 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => handleViewOrderDetail(order)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm text-professional-body font-medium">
                          {formatCurrency(order.total)}
                        </span>
                        {order.deliveryCost > 0 && (
                          <span className="text-xs text-orange-600 ml-2">
                            (+{formatCurrency(order.deliveryCost)} envío)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-professional-body text-right">
                        {order.paymentMethods && order.paymentMethods.length > 1 ? (
                          <div className="space-y-1">
                            {order.paymentMethods.map((payment, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span>{payment.method}:</span>
                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          order.paymentMethod
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-professional-body">
                        {formatDate(order.updatedAt || order.createdAt)}
                      </span>
                      <span className="text-xs text-professional-body">
                        {order.foods?.length || 0} productos
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">
                        Cliente: {order.name || order.buyer?.name || 'Cliente anónimo'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.section === 'delivery' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {order.section === 'delivery' ? 'Delivery' : 'Mostrador'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-professional-body text-sm">No hay pedidos registrados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear Caja */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-professional p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-professional-subtitle">Abrir Nueva Caja</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setInitialAmount('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-professional-body mb-2">
                Monto Inicial
              </label>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="0"
                min="0"
                step="1000"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setInitialAmount('');
                }}
                className="btn-professional-outline"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCash}
                disabled={isCreating}
                className="btn-professional-secondary"
              >
                {isCreating ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de pedido */}
      {showOrderDetailModal && selectedOrder && (
        <VentaDetailModal
          venta={selectedOrder}
          isOpen={showOrderDetailModal}
          onClose={async () => {
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
            
            // Refrescar todas las fuentes de datos al cerrar el modal
            const promises = [];
            
            // Refrescar ventas de caja activa
            if (isOpen) {
              promises.push(refetchSales());
            }
            
            // Refrescar ventas de caja seleccionada
            if (selectedCashRegister) {
              promises.push(refetchSelectedSales());
            }
            
            // Refrescar historial de cajas
            promises.push(refetch());
            
            // Esperar a que todas las actualizaciones se completen
            await Promise.all(promises);
          }}
          onVentaUpdated={async (updatedVenta) => {
            // Actualizar la venta seleccionada
            setSelectedOrder(updatedVenta);
            
            // Refrescar inmediatamente todas las fuentes de datos
            const promises = [];
            
            // Refrescar ventas de caja activa si existe
            if (isOpen) {
              promises.push(refetchSales());
            }
            
            // Refrescar ventas de caja seleccionada si existe
            if (selectedCashRegister) {
              promises.push(refetchSelectedSales());
            }
            
            // Refrescar el historial de cajas para actualizar totales en la tabla
            promises.push(refetch());
            
            // Esperar a que todas las actualizaciones se completen
            await Promise.all(promises);
          }}
          products={products}
          productsLoading={productsLoading}
        />
      )}

      {/* Notificación toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {notification}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegister;