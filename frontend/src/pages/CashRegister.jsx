import React from 'react';
import { useCashRegister } from '../store/CashRegisterContext';
import { useCashRegisters } from '../hooks/useCashRegisters';
import { useCashRegisterSales } from '../hooks/useCashRegisterSales';
import { useTips } from '../hooks/useTips';
import { PlusIcon, XMarkIcon, PrinterIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import VentaDetailModal from '../components/common/VentaDetailModal';
import printingService from '../services/printingService';
import cashRegisterService from '../services/cashRegisterService';
import api from '../services/api';
import { useProducts } from '../hooks/useProducts';
import { onSocketEvent, getSocketId } from '../services/socketService';

const CashRegister = () => {
  // Estados principales
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedCashRegister, setSelectedCashRegister] = React.useState(null);
  const [notification, setNotification] = React.useState(null);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = React.useState(false);
  
  // Estados para modal de detalle de pedido
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = React.useState(false);
  
  // Estados para crear caja
  const [initialAmount, setInitialAmount] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  
  // Estados para cerrar caja
  const [officialIncome, setOfficialIncome] = React.useState({
    Efectivo: '',
    Debito: '',
    Transferencia: ''
  });
  const [comment, setComment] = React.useState('');
  const [isClosing, setIsClosing] = React.useState(false);

  // Estados para colapsar paneles
  const [currentCashCollapsed, setCurrentCashCollapsed] = React.useState(false);

  // Estados para registrar ingresos/egresos de caja
  const [showMovementModal, setShowMovementModal] = React.useState(false);
  const [movementType, setMovementType] = React.useState('Ingreso');
  const [movementAmount, setMovementAmount] = React.useState('');
  const [movementDescription, setMovementDescription] = React.useState('');
  const [isSavingMovement, setIsSavingMovement] = React.useState(false);

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
    movements: currentCashMovements,
    statistics: currentCashStatistics,
    isLoading: salesLoading,
    error: salesError,
    refetch: refetchSales
  } = useCashRegisterSales(null, { activeOnly: isOpen });

  // Hook para obtener ventas de caja seleccionada
  const {
    sales: selectedCashSales,
    movements: selectedCashMovements,
    statistics: selectedCashStatistics,
    isLoading: selectedSalesLoading,
    refetch: refetchSelectedSales
  } = useCashRegisterSales(selectedCashRegister?._id);

  // Hook para obtener productos
  const { products, isLoading: productsLoading } = useProducts();

  // Hook para obtener propinas de la caja activa
  const {
    statistics: currentTipsStatistics,
    isLoading: currentTipsLoading,
    refetch: refetchTips
  } = useTips({ activeOnly: isOpen });

  // Hook para obtener propinas de caja seleccionada
  const {
    statistics: selectedTipsStatistics,
    refetch: refetchSelectedTips
  } = useTips({ cashRegisterId: selectedCashRegister?._id });

  // Efecto para refrescar ventas cuando se monta el componente
  React.useEffect(() => {
    // Refrescar ventas de caja activa si hay una caja abierta
    if (isOpen) {
      refetchSales();
      refetchTips();
    }
    // Refrescar ventas de caja seleccionada si hay una seleccionada
    if (selectedCashRegister) {
      refetchSelectedSales();
      refetchSelectedTips();
    }
  }, []); // Se ejecuta solo al montar el componente



  // Mantener el detalle sincronizado cuando otro dispositivo registra o elimina un movimiento
  React.useEffect(() => {
    const handleMovementChange = ({ cashRegisterId, _fromSocketId }) => {
      if (_fromSocketId && _fromSocketId === getSocketId()) return;
      if (isOpen && cashRegisterId === currentCashRegister?._id) refetchSales();
      if (cashRegisterId === selectedCashRegister?._id) refetchSelectedSales();
    };

    const unsubCreated = onSocketEvent('cashmovement:created', handleMovementChange);
    const unsubDeleted = onSocketEvent('cashmovement:deleted', handleMovementChange);

    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [isOpen, currentCashRegister?._id, selectedCashRegister?._id]);

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
    
    // Para cajas cerradas: siempre usar el valor almacenado en el momento del cierre.
    // Recalcular desde las ventas puede dar un total diferente (por propinas, delivery, etc.)
    // lo que provoca que el total cambie visualmente al seleccionar la caja.
    if (cashRegister.status === 'Cerrada') {
      return cashRegister.amountSystem || 0;
    }

    // Para la caja actual abierta: usar cálculo en tiempo real
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
    
    // Para cualquier otra caja abierta seleccionada
    if (cashRegister._id === selectedCashRegister?._id) {
      if (selectedCashStatistics?.systemTotal !== undefined && selectedCashStatistics.systemTotal !== null) {
        return selectedCashStatistics.systemTotal;
      }
      if (selectedCashSales && selectedCashSales.length > 0) {
        return calculateSystemTotal(selectedCashSales);
      }
    }
    
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

  const calculateMovementTotals = (movements) => {
    const list = Array.isArray(movements) ? movements : [];
    const totalIncome = list
      .filter(m => m.type === 'Ingreso')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalExpense = list
      .filter(m => m.type === 'Egreso')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    return { totalIncome, totalExpense, netTotal: totalIncome - totalExpense };
  };

  const getCanceledOrdersStats = (statistics) => {
    return {
      count: statistics?.canceledOrders || 0,
      total: statistics?.canceledTotal || 0
    };
  };

  const getDifference = (systemTotal, officialTotal) => {
    return officialTotal - systemTotal;
  };

  const currentCanceledStats = getCanceledOrdersStats(currentCashStatistics);
  const currentMovementTotals = calculateMovementTotals(currentCashMovements);
  const currentCardsLoading = salesLoading || currentTipsLoading;

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
        // Si requiere suscripción, mostrar modal de alerta especial
        if (result.requiresSubscription) {
          setShowCreateModal(false);
          setShowSubscriptionAlert(true);
        } else {
          setNotification(result.error || 'Error al abrir la caja');
          setTimeout(() => setNotification(null), 3000);
        }
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
        setOfficialIncome({ Efectivo: '', Debito: '', Transferencia: '' });
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

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Refresca el detalle abierto y las tarjetas de la caja activa tras un movimiento
  const refreshAfterMovement = (cashRegisterId) => {
    if (isOpen) refetchSales();
    if (selectedCashRegister?._id === cashRegisterId) refetchSelectedSales();
  };

  const handleOpenMovementModal = (type) => {
    setMovementType(type);
    setMovementAmount('');
    setMovementDescription('');
    setShowMovementModal(true);
  };

  const handleSaveMovement = async () => {
    const amount = parseFloat(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Ingrese un monto mayor a 0');
      return;
    }

    const targetCashRegister = selectedCashRegister?.status === 'Abierta'
      ? selectedCashRegister
      : currentCashRegister;

    if (!targetCashRegister) {
      showNotification('No hay una caja abierta para registrar el movimiento');
      return;
    }

    try {
      setIsSavingMovement(true);
      const response = await cashRegisterService.addCashMovement({
        type: movementType,
        amount,
        description: movementDescription,
        cashRegisterId: targetCashRegister._id,
      });

      if (response.success) {
        setShowMovementModal(false);
        setMovementAmount('');
        setMovementDescription('');
        refreshAfterMovement(targetCashRegister._id);
        showNotification(`${movementType} registrado exitosamente`);
      } else {
        showNotification(response.message || 'Error al registrar el movimiento');
      }
    } catch (error) {
      showNotification(error.message || 'Error al registrar el movimiento');
    } finally {
      setIsSavingMovement(false);
    }
  };

  const handleDeleteMovement = async (movement) => {
    if (!window.confirm('¿Eliminar este movimiento de caja?')) return;

    try {
      const response = await cashRegisterService.deleteCashMovement(movement._id);
      if (response.success) {
        refreshAfterMovement(movement.cashRegister);
        showNotification('Movimiento eliminado');
      } else {
        showNotification(response.message || 'Error al eliminar el movimiento');
      }
    } catch (error) {
      showNotification(error.message || 'Error al eliminar el movimiento');
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
      // Calcular totales por método de pago desde las ventas reales de la caja seleccionada
      const systemTotalsByPayment = calculateSystemTotalsByPaymentMethod(selectedCashSales || []);
      const movements = selectedCashMovements || [];
      // Retransmitir siempre a los demás dispositivos, sin depender de si este equipo tiene impresora propia
      api.post('/cash/broadcast-report', {
        cashRegister,
        systemTotalsByPayment,
        tipsStatistics: selectedTipsStatistics,
        movements,
      }).catch((err) => {
        console.error('Error al retransmitir reporte de caja a otros dispositivos:', err);
      });

      // Si este equipo no tiene impresora propia configurada, delega la impresión a otro dispositivo
      if (!printingService.hasLocalPrinterConfigured()) {
        setNotification('Reporte enviado para impresión en otro dispositivo');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      const result = await printingService.printCashRegisterReport(cashRegister, systemTotalsByPayment, selectedTipsStatistics, movements);
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
    <div className="h-full bg-professional flex flex-col lg:flex-row gap-2 lg:gap-4 p-2 lg:p-4 overflow-auto lg:overflow-hidden">
      {/* Contenido Principal */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 lg:gap-4">
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
                <>
                  <button
                    onClick={() => handleOpenMovementModal('Ingreso')}
                    className="btn-professional-secondary flex items-center gap-2 text-sm px-3 py-2"
                    title="Registrar un ingreso de dinero a la caja"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                    Ingreso
                  </button>
                  <button
                    onClick={() => handleOpenMovementModal('Egreso')}
                    className="btn-professional-secondary flex items-center gap-2 text-sm px-3 py-2"
                    title="Registrar una salida de dinero de la caja"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                    Egreso
                  </button>
                  <button
                    onClick={() => setSelectedCashRegister(currentCashRegister)}
                    className="btn-professional-primary flex items-center gap-2 text-sm px-3 py-2"
                  >
                    Cerrar Caja
                  </button>
                </>
              )}
              {printingService.getDrawerPrinter() && (printingService.isCurrentUserOwner() || printingService.getDrawerAlwaysOpen()) && (
                <button
                  onClick={async () => {
                    const printer = printingService.getDrawerPrinter() || localStorage.getItem('drawerPrinter') || null;
                    const res = await printingService.openDrawer(printer);
                    if (!res.success) {
                      console.error('Error abriendo caja:', res.error || res.message);
                      alert('No se pudo abrir la caja: ' + (res.error || res.message || 'Error desconocido'));
                    }
                  }}
                  className="btn-professional-secondary flex items-center gap-2 text-sm px-3 py-2"
                  title="Abrir caja"
                >
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 6h10v12H7z"/></svg>
                  Abrir Caja
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2 lg:gap-3 auto-rows-fr">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded border border-green-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-green-700 font-medium">Estado</p>
                  <p className="text-xs lg:text-sm font-bold text-green-800">Abierta</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded border border-blue-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-blue-700 font-medium">Inicial</p>
                  <p className="text-xs lg:text-sm font-bold text-blue-800">{formatCurrency(currentCashRegister.initialBalance)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 rounded border border-purple-200 col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-1 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-purple-700 font-medium">Apertura</p>
                  <p className="text-xs lg:text-sm font-bold text-purple-800">{formatDate(currentCashRegister.dateOpened)}</p>
                </div>
                <div className="total-highlight p-2 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs font-medium">Total Sistema</p>
                  <p className="text-xs lg:text-sm font-bold">
                    {formatCurrency(getSystemTotalForCashRegister(currentCashRegister))}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-2 rounded border border-red-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-red-700 font-medium">Cancelados (control)</p>
                  {currentCardsLoading ? (
                    <p className="text-xs lg:text-sm font-bold text-red-800">Cargando...</p>
                  ) : (
                    <>
                      <p className="text-xs lg:text-sm font-bold text-red-800">
                        {formatCurrency(currentCanceledStats.total)}
                      </p>
                      <p className="text-[11px] text-red-700">{currentCanceledStats.count} pedidos</p>
                    </>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-lime-50 to-lime-100 p-2 rounded border border-lime-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-lime-700 font-medium">Ingresos</p>
                  {currentCardsLoading ? (
                    <p className="text-xs lg:text-sm font-bold text-lime-800">Cargando...</p>
                  ) : (
                    <p className="text-xs lg:text-sm font-bold text-lime-800">
                      {formatCurrency(currentMovementTotals.totalIncome)}
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-2 rounded border border-rose-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-rose-700 font-medium">Egresos</p>
                  {currentCardsLoading ? (
                    <p className="text-xs lg:text-sm font-bold text-rose-800">Cargando...</p>
                  ) : (
                    <p className="text-xs lg:text-sm font-bold text-rose-800">
                      {formatCurrency(currentMovementTotals.totalExpense)}
                    </p>
                  )}
                </div>

                {/* Propinas integradas */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-2 rounded border border-teal-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-teal-700 font-medium">Propinas</p>
                  <p className="text-xs lg:text-sm font-bold text-teal-800">
                    {currentCardsLoading ? 'Cargando...' : formatCurrency(currentTipsStatistics?.totalTips || 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-2 rounded border border-emerald-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-emerald-700 font-medium">Órdenes</p>
                  <p className="text-xs lg:text-sm font-bold text-emerald-800">
                    {currentCardsLoading ? 'Cargando...' : (currentTipsStatistics?.totalOrders || 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-2 rounded border border-cyan-200 min-h-[68px] flex flex-col justify-between">
                  <p className="text-xs text-cyan-700 font-medium">Promedio</p>
                  <p className="text-xs lg:text-sm font-bold text-cyan-800">
                    {currentCardsLoading ? 'Cargando...' : formatCurrency(currentTipsStatistics?.averageTip || 0)}
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
        <div className="mobile-detail-panel card-professional p-3 lg:p-6 overflow-y-auto scrollbar-professional">
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

          {/* Contenido dependiente de ventas */}
          {selectedSalesLoading ? (
            <div className="space-y-3 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-8 bg-gray-100 rounded"></div>
                </div>
              ))}
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="space-y-1">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Totales por Método de Pago del Sistema */}
          <div className="mb-6">
            <h4 className="text-professional-subtitle mb-3">Totales del Sistema por Método de Pago</h4>
            <div className="space-y-2">
              {(() => {
                const STANDARD_METHODS = ['Efectivo', 'Debito', 'Transferencia'];
                const totals = calculateSystemTotalsByPaymentMethod(selectedCashSales || []);
                const extraMethods = Object.keys(totals).filter(m => !STANDARD_METHODS.includes(m));
                return [...STANDARD_METHODS, ...extraMethods].map((method) => (
                  <div key={method} className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">{method}</p>
                    <p className="text-sm font-bold text-blue-800">{formatCurrency(totals[method] || 0)}</p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Ingresos por Delivery */}
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

          {/* Pedidos Cancelados (control) */}
          {getCanceledOrdersStats(selectedCashStatistics).count > 0 && (
            <div className="mb-6">
              <h4 className="text-professional-subtitle mb-3">Pedidos Cancelados</h4>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-red-700 font-medium">Total de pedidos cancelados</p>
                    <p className="text-sm text-red-600">No se incluye en los totales de caja</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(getCanceledOrdersStats(selectedCashStatistics).total)}
                    </p>
                    <p className="text-xs text-red-700 font-medium">
                      {getCanceledOrdersStats(selectedCashStatistics).count} pedidos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Propinas */}
          {selectedTipsStatistics && selectedTipsStatistics.totalTips > 0 && (
            <div className="mb-6">
              <h4 className="text-professional-subtitle mb-3">Propinas</h4>
              <div className="bg-gradient-to-br from-teal-50 to-emerald-100 p-3 rounded-lg border border-teal-200">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-teal-700 font-medium">Total Propinas</p>
                    <p className="text-sm font-bold text-teal-900">
                      {formatCurrency(selectedTipsStatistics.totalTips || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-teal-700 font-medium">Órdenes</p>
                    <p className="text-sm font-bold text-teal-900">
                      {selectedTipsStatistics.totalOrders || 0}
                    </p>
                  </div>
                </div>
                {selectedTipsStatistics.tipsByWaiter && selectedTipsStatistics.tipsByWaiter.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-teal-700 font-medium mb-1">Por Mesero:</p>
                    {selectedTipsStatistics.tipsByWaiter.map((item, index) => (
                      <div key={index} className="bg-white bg-opacity-60 p-2 rounded border border-teal-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-700">
                            {typeof item.waiter === 'string' ? item.waiter : item.waiter?.userName || item.waiter?.name || 'Sin mesero'}
                          </span>
                          <span className="text-xs font-bold text-teal-800">
                            {formatCurrency(item.totalTips || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ingresos y Egresos de Caja */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-professional-subtitle">Ingresos y Egresos</h4>
              {selectedCashRegister.status === 'Abierta' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenMovementModal('Ingreso')}
                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                  >
                    + Ingreso
                  </button>
                  <button
                    onClick={() => handleOpenMovementModal('Egreso')}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                  >
                    + Egreso
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const movements = selectedCashMovements || [];
              const { totalIncome, totalExpense, netTotal } = calculateMovementTotals(movements);
              const systemTotals = calculateSystemTotalsByPaymentMethod(selectedCashSales || []);
              const expectedCash = (selectedCashRegister.initialBalance || 0) + (systemTotals.Efectivo || 0) + netTotal;

              return (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 font-medium">Total Ingresos</p>
                      <p className="text-sm font-bold text-green-800">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700 font-medium">Total Egresos</p>
                      <p className="text-sm font-bold text-red-800">{formatCurrency(totalExpense)}</p>
                    </div>
                  </div>

                  {movements.length === 0 ? (
                    <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-professional-body text-sm">No hay ingresos ni egresos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-1 mb-3">
                      {movements.map((movement) => (
                        <div
                          key={movement._id}
                          className={`p-2 rounded-lg border ${
                            movement.type === 'Ingreso'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-bold ${
                                movement.type === 'Ingreso' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {movement.type === 'Ingreso' ? '+' : '-'}{formatCurrency(movement.amount)}
                              </p>
                              {movement.description && (
                                <p className="text-xs text-gray-700 break-words">{movement.description}</p>
                              )}
                              <p className="text-[11px] text-gray-500">
                                {formatDate(movement.createdAt)}
                                {(movement.createdBy?.userName || movement.createdByName)
                                  ? ` · ${movement.createdBy?.userName || movement.createdByName}`
                                  : ''}
                              </p>
                            </div>
                            {selectedCashRegister.status === 'Abierta' && (
                              <button
                                onClick={() => handleDeleteMovement(movement)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors flex-shrink-0"
                                title="Eliminar movimiento"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Arqueo: efectivo que deberia haber fisicamente en la caja */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800 font-medium mb-2">Efectivo Esperado en Caja</p>
                    <div className="space-y-1 text-xs text-gray-700">
                      <div className="flex justify-between">
                        <span>Monto inicial</span>
                        <span className="font-medium">{formatCurrency(selectedCashRegister.initialBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ventas en efectivo</span>
                        <span className="font-medium">{formatCurrency(systemTotals.Efectivo || 0)}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>(+) Ingresos</span>
                        <span className="font-medium">{formatCurrency(totalIncome)}</span>
                      </div>
                      <div className="flex justify-between text-red-700">
                        <span>(-) Egresos</span>
                        <span className="font-medium">{formatCurrency(totalExpense)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-amber-200 text-sm font-bold text-amber-900">
                        <span>Efectivo esperado</span>
                        <span>{formatCurrency(expectedCash)}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Ingresos Oficiales */}
          {selectedCashRegister.status === 'Cerrada' && selectedCashRegister.officialIncome && (
            <div className="mb-6">
              <h4 className="text-professional-subtitle mb-3">Ingresos Oficiales Declarados</h4>
              <div className="space-y-2">
                {['Efectivo', 'Debito', 'Transferencia'].map((method) => {
                  const amount = selectedCashRegister.officialIncome[method] ?? 0;
                  const systemTotals = calculateSystemTotalsByPaymentMethod(selectedCashSales || []);
                  const systemAmount = systemTotals[method] || 0;
                  return (
                  <div key={method} className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-amber-700 font-medium">{method}</p>
                        <p className="text-sm font-bold text-amber-800">{formatCurrency(amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Sistema:</p>
                        <p className="text-xs font-medium text-gray-700">
                          {formatCurrency(systemAmount)}
                        </p>
                        <p className={`text-xs font-bold ${
                          (parseFloat(amount) - systemAmount) >= 0 
                            ? 'text-green-700' 
                            : 'text-red-700'
                        }`}>
                          {(parseFloat(amount) - systemAmount) >= 0 ? '+' : ''}
                          {formatCurrency(parseFloat(amount) - systemAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ); })}
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
                          : order.section === 'mesas'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {order.section === 'delivery' ? 'Delivery' : order.section === 'mesas' ? 'Mesas' : 'Mostrador'}
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
          </>
          )}
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

      {/* Modal Registrar Ingreso / Egreso */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-professional p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-professional-subtitle">
                Registrar {movementType}
              </h3>
              <button
                onClick={() => setShowMovementModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setMovementType('Ingreso')}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  movementType === 'Ingreso'
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Ingreso
              </button>
              <button
                onClick={() => setMovementType('Egreso')}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  movementType === 'Egreso'
                    ? 'bg-red-100 border-red-400 text-red-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Egreso
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-professional-body mb-2">
                Monto
              </label>
              <input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="0"
                min="0"
                step="100"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-professional-body mb-2">
                Comentario <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                placeholder={movementType === 'Ingreso' ? 'Ej: aporte de socio' : 'Ej: pago proveedor verduras'}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMovementModal(false)}
                className="btn-professional-outline"
                disabled={isSavingMovement}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMovement}
                disabled={isSavingMovement}
                className="btn-professional-secondary"
              >
                {isSavingMovement ? 'Guardando...' : `Registrar ${movementType}`}
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
          onClose={() => {
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
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

      {/* Modal de alerta de suscripción */}
      {showSubscriptionAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white text-center">
              <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-3 animate-bounce" />
              <h2 className="text-2xl font-bold">⚠️ Suscripción Requerida</h2>
            </div>
            
            {/* Contenido */}
            <div className="p-6">
              <div className="bg-red-50 rounded-lg p-4 mb-5 border-2 border-red-200">
                <p className="text-red-800 font-semibold mb-3 text-center">
                  No tienes una suscripción activa
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  Para poder abrir caja y procesar pedidos, necesitas una suscripción activa.
                </p>
                <div className="bg-white rounded-md p-3 border border-red-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Sin suscripción no podrás:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>✗ Abrir caja registradora</li>
                    <li>✗ Crear nuevos pedidos</li>
                    <li>✗ Procesar ventas</li>
                  </ul>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSubscriptionAlert(false);
                    window.location.href = '/subscription/plans';
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🎯 Ver Planes de Suscripción
                </button>
                <button
                  onClick={() => setShowSubscriptionAlert(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-6 rounded-lg font-medium transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegister;