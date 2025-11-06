import React from 'react';
import { useCashRegister } from '../hooks/useCashRegister';
import { useCashRegisters } from '../hooks/useCashRegisters';
import { PlusIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import VentaDetailModal from '../components/common/VentaDetailModal';
import printingService from '../services/printingService';

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

  // Funciones de utilidad
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount || 0);
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
    return orders.reduce((totals, order) => {
      const method = order.paymentMethod || 'Sin especificar';
      totals[method] = (totals[method] || 0) + (order.total || 0);
      return totals;
    }, {});
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
    // Adaptar los datos de la orden para que coincidan con la estructura esperada por VentaDetailModal
    const adaptedOrder = {
      ...order,
      // Mapear campos para compatibilidad con el modal
      payment: order.paymentMethod,
      createdAt: order.date,
      foods: order.items?.map((item, index) => ({
        food: {
          title: item.name || `Producto ${index + 1}`,
          price: item.price || 0
        },
        quantity: item.quantity || 1,
        comment: item.comment || ''
      })) || [],
      // Campos adicionales que el modal puede esperar
      name: 'Cliente anónimo',
      buyer: {
        name: 'Cliente anónimo'
      },
      status: 'Completado',
      section: 'mostrador'
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
    <div className="h-full bg-professional flex gap-4 p-4 overflow-hidden">
      {/* Contenido Principal */}
      <div className={`${selectedCashRegister ? 'w-2/3' : 'w-full'} flex flex-col gap-4 transition-all duration-300`}>
        {/* Header */}
        <div className="card-professional p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-professional-title">Gestión de Cajas</h1>
              <p className="text-professional-body mt-1">Administra las cajas registradoras del restaurante</p>
            </div>
            <div className="flex gap-3">
              {!isOpen && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-professional-secondary flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Abrir Caja
                </button>
              )}
              {isOpen && (
                <button
                  onClick={() => setSelectedCashRegister(currentCashRegister)}
                  className="btn-professional-primary flex items-center gap-2"
                >
                  Cerrar Caja
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Caja Actual */}
        {isOpen && currentCashRegister && (
          <div className="card-professional p-4 flex-shrink-0">
            <h2 className="text-professional-subtitle mb-3">Caja Actual</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 font-medium">Estado</p>
                <p className="text-sm font-bold text-green-800">Abierta</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium">Monto Inicial</p>
                <p className="text-sm font-bold text-blue-800">{formatCurrency(currentCashRegister.initialBalance)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium">Fecha de Apertura</p>
                <p className="text-sm font-bold text-purple-800">{formatDate(currentCashRegister.dateOpened)}</p>
              </div>
              <div className="total-highlight p-3">
                <p className="text-xs font-medium">Total del Sistema</p>
                <p className="text-sm font-bold">
                  {formatCurrency(calculateSystemTotal(currentCashRegister.orders))}
                </p>
                <p className="text-xs mt-1">
                  {currentCashRegister.orders?.length || 0} pedidos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Cajas */}
        <div className="card-professional flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-opacity-20 border-amber-300 flex-shrink-0">
            <h2 className="text-professional-subtitle">Historial de Cajas</h2>
            <p className="text-professional-body mt-1">Registro de todas las cajas registradoras</p>
          </div>
          
          {historyError && (
            <div className="p-6 text-center">
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
            <div className="p-6 text-center">
              <p className="text-professional-body">No hay cajas registradas</p>
            </div>
          )}

          {!historyError && cashRegisters.length > 0 && (
            <div className="flex-1 overflow-auto scrollbar-professional">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Fecha Apertura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Fecha Cierre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Monto Inicial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Total Sistema
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Total Oficial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white bg-opacity-50 divide-y divide-amber-100">
                  {[...cashRegisters]
                    .sort((a, b) => new Date(b.dateOpened) - new Date(a.dateOpened))
                    .map((cashRegister) => {
                    const systemTotal = calculateSystemTotal(cashRegister.orders);
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            cashRegister.status === 'Abierta' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {cashRegister.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body">
                          {formatDate(cashRegister.dateOpened)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body">
                          {formatDate(cashRegister.dateClosed)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body font-medium">
                          {formatCurrency(cashRegister.initialBalance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body font-medium">
                          {formatCurrency(systemTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body font-medium">
                          {formatCurrency(officialTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-bold ${
                            difference > 0 ? 'text-green-700' : 
                            difference < 0 ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
          )}
        </div>
      </div>

      {/* Panel de Detalle Lateral */}
      {selectedCashRegister && (
        <div className="w-1/3 card-professional p-6 overflow-y-auto scrollbar-professional">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-professional-subtitle">
              Detalle de Caja
            </h3>
            <div className="flex items-center gap-2">
              {selectedCashRegister.status === 'Cerrada' && (
                <button
                  onClick={() => handlePrintCashRegisterReport(selectedCashRegister)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                  title="Imprimir reporte de caja"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setSelectedCashRegister(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Información General */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 font-medium">Estado</p>
              <p className="text-sm font-bold text-gray-800">{selectedCashRegister.status}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 font-medium">Monto Inicial</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(selectedCashRegister.initialBalance)}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 col-span-2">
              <p className="text-xs text-gray-700 font-medium">Fecha Apertura</p>
              <p className="text-sm font-bold text-gray-800">{formatDate(selectedCashRegister.dateOpened)}</p>
            </div>
          </div>

          {selectedCashRegister.status === 'Cerrada' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 col-span-2">
                <p className="text-xs text-gray-700 font-medium">Fecha Cierre</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(selectedCashRegister.dateClosed)}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700 font-medium">Total Sistema</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(calculateSystemTotal(selectedCashRegister.orders))}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700 font-medium">Total Oficial</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(calculateOfficialTotal(selectedCashRegister.officialIncome))}
                </p>
              </div>
              <div className={`p-3 rounded-lg border col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200`}>
                <p className="text-xs text-gray-700 font-medium">
                  Diferencia
                </p>
                <p className={`text-sm font-bold ${
                  getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(selectedCashRegister.officialIncome)) >= 0
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(selectedCashRegister.officialIncome)) >= 0 ? '+' : ''}
                  {formatCurrency(getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(selectedCashRegister.officialIncome)))}
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
              {Object.entries(calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)).map(([method, amount]) => (
                <div key={method} className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">{method}</p>
                  <p className="text-sm font-bold text-blue-800">{formatCurrency(amount)}</p>
                </div>
              ))}
              {Object.keys(calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-professional-body text-sm">No hay totales por método de pago</p>
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
                      {calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)[method] && (
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Sistema:</p>
                          <p className="text-xs font-medium text-gray-700">
                            {formatCurrency(calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)[method])}
                          </p>
                          <p className={`text-xs font-bold ${
                            (parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)[method]) >= 0 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {(parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)[method]) >= 0 ? '+' : ''}
                            {formatCurrency(parseFloat(amount) - calculateSystemTotalsByPaymentMethod(selectedCashRegister.orders)[method])}
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
                    getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(officialIncome)) >= 0 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(officialIncome)) >= 0 ? '+' : ''}
                    {formatCurrency(getDifference(calculateSystemTotal(selectedCashRegister.orders), calculateOfficialTotal(officialIncome)))}
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
              Pedidos ({selectedCashRegister.orders?.length || 0})
            </h4>
            
            {selectedCashRegister.orders && selectedCashRegister.orders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-professional">
                {selectedCashRegister.orders.map((order, index) => (
                  <div 
                    key={index} 
                    className="bg-white bg-opacity-50 p-3 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => handleViewOrderDetail(order)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-professional-body font-medium">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-xs text-professional-body">
                        {order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-professional-body">
                        {formatDate(order.date)}
                      </span>
                      <span className="text-xs text-professional-body">
                        {order.items?.length || 0} productos
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
          onClose={() => {
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
          }}
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