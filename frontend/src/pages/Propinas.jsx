import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  UserIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useTips } from '../hooks/useTips';
import { useWaiters } from '../hooks/useUsers';
import { useProducts } from '../hooks/useProducts';
import VentaDetailModal from '../components/common/VentaDetailModal';
import { getChileToday, formatChileDateTime, formatChileanCurrency } from '../utils/dateUtils';

const Propinas = () => {
  // Obtener fecha de hoy en zona horaria de Chile
  const today = getChileToday();
  
  // Estados para filtros - Por defecto filtrar por hoy
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [waiterId, setWaiterId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para colapsar paneles
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  
  // Estados para modal de detalle
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Hook para obtener propinas con filtros
  const { tips, statistics, isLoading, error, refetch } = useTips({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    waiterId: waiterId === 'all' ? undefined : waiterId
  });

  // Hook para obtener productos
  const { products, isLoading: productsLoading } = useProducts();

  // Hook para obtener meseros
  const { waiters, isLoading: waitersLoading } = useWaiters();

  // Efecto para refrescar propinas cuando se monta el componente
  useEffect(() => {
    refetch();
  }, []); // Solo al montar

  // Efecto para refrescar cuando la página se hace visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Filtrar propinas según criterios de búsqueda local
  const propinasFiltradas = useMemo(() => {
    return tips.filter(tip => {
      let matches = true;

      // Filtro por búsqueda (cliente o ID de orden)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        matches = matches && (
          tip.name?.toLowerCase().includes(term) ||
          tip.buyer?.name?.toLowerCase().includes(term) ||
          tip._id?.toLowerCase().includes(term) ||
          tip.orderNumber?.toString().includes(term)
        );
      }

      return matches;
    });
  }, [tips, searchTerm]);

  // Formatear fecha
  const formatDate = (dateString) => {
    return formatChileDateTime(dateString);
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return formatChileanCurrency(amount);
  };

  // Obtener nombre del mesero
  const getWaiterName = (waiter) => {
    if (!waiter) return 'Sin mesero';
    return typeof waiter === 'string' ? waiter : waiter.userName || waiter.name || 'Mesero';
  };

  // Limpiar filtros
  const clearFilters = () => {
    const todayDate = getChileToday();
    setDateFrom(todayDate);
    setDateTo(todayDate);
    setWaiterId('all');
    setSearchTerm('');
    setFiltersCollapsed(false);
    setSummaryCollapsed(false);
  };

  // Abrir modal de detalle
  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // Mostrar loading inicial
  if (isLoading && tips.length === 0) {
    return (
      <div className="h-full bg-professional flex items-center justify-center">
        <div className="text-center">
          <div className="loading-professional mx-auto mb-4"></div>
          <p className="text-professional-body">Cargando información de propinas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-professional flex justify-center gap-4 p-2 lg:p-4 overflow-hidden">
      {/* Contenido Principal */}
      <div className="w-full max-w-7xl flex flex-col gap-2 lg:gap-3">
        {/* Header */}
        <div className="card-professional p-3 lg:p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-amber-800">Propinas</h1>
              <p className="text-sm text-gray-600 mt-1 hidden lg:block">
                Gestiona y analiza todas las propinas recibidas
              </p>
            </div>
          </div>
        </div>

        {/* Panel de filtros - Colapsable */}
        <div className="card-professional p-2 lg:p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm lg:text-base font-semibold text-amber-800">Filtros</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                className="text-sm w-6 h-6 flex items-center justify-center rounded border border-amber-300 text-amber-700 hover:bg-amber-50 font-mono"
              >
                {filtersCollapsed ? '+' : '−'}
              </button>
              <button
                onClick={clearFilters}
                className="btn-professional-outline text-xs px-2 py-1"
              >
                Limpiar
              </button>
            </div>
          </div>
          
          {!filtersCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mesero
                </label>
                <select
                  value={waiterId}
                  onChange={(e) => setWaiterId(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                  disabled={waitersLoading}
                >
                  <option value="all">Todos los meseros</option>
                  {waiters.map(waiter => (
                    <option key={waiter._id} value={waiter._id}>
                      {waiter.userName || waiter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cliente, orden..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel de estadísticas - Colapsable */}
        <div className="card-professional p-2 lg:p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm lg:text-base font-semibold text-amber-800">Resumen</h3>
            <button
              onClick={() => setSummaryCollapsed(!summaryCollapsed)}
              className="text-sm w-6 h-6 flex items-center justify-center rounded border border-amber-300 text-amber-700 hover:bg-amber-50 font-mono"
            >
              {summaryCollapsed ? '+' : '−'}
            </button>
          </div>
          
          {!summaryCollapsed && (
            <>
              {/* Estadísticas generales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-lg border border-gray-200 text-center">
                  <p className="text-xs text-gray-700 font-medium">Total Propinas</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(statistics.totalTips || 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded-lg border border-green-200 text-center">
                  <p className="text-xs text-green-700 font-medium">Órdenes</p>
                  <p className="text-sm font-bold text-green-800">{statistics.totalOrders || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded-lg border border-blue-200 text-center">
                  <p className="text-xs text-blue-700 font-medium">Promedio</p>
                  <p className="text-sm font-bold text-blue-800">{formatCurrency(statistics.averageTip || 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 rounded-lg border border-purple-200 text-center">
                  <p className="text-xs text-purple-700 font-medium">Meseros</p>
                  <p className="text-sm font-bold text-purple-800">{statistics.tipsByWaiter?.length || 0}</p>
                </div>
              </div>

              {/* Propinas por mesero */}
              {statistics.tipsByWaiter && statistics.tipsByWaiter.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Propinas por Mesero</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {statistics.tipsByWaiter.map((item, index) => (
                      <div key={index} className="bg-white border border-amber-200 rounded-lg p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <UserIcon className="h-4 w-4 text-amber-600" />
                          <p className="text-xs font-medium text-gray-800">
                            {getWaiterName(item.waiter)}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Total:</span>
                          <span className="text-sm font-bold text-amber-700">
                            {formatCurrency(item.totalTips || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Órdenes:</span>
                          <span className="text-xs font-semibold text-gray-700">
                            {item.orderCount || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lista de propinas */}
        <div className="card-professional flex-1 flex flex-col overflow-hidden min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="loading-professional mx-auto mb-4"></div>
                <p className="text-professional-body">Cargando propinas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={refetch}
                  className="btn-professional-outline"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          ) : propinasFiltradas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-professional-body">No se encontraron propinas con los filtros aplicados</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto scrollbar-professional">
              {/* Vista de tabla para pantallas grandes */}
              <div className="hidden lg:block">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Orden #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Mesero
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Total Orden
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Propina
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        % Propina
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white bg-opacity-50 divide-y divide-amber-100">
                    {propinasFiltradas.map((propina) => {
                      const percentage = propina.total > 0 
                        ? ((propina.tip / propina.total) * 100).toFixed(1)
                        : 0;
                      
                      return (
                        <tr 
                          key={propina._id} 
                          className="hover:bg-amber-50 hover:bg-opacity-50 transition-colors cursor-pointer"
                          onClick={() => handleViewDetail(propina)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{propina.orderNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {propina.name || propina.buyer?.name || 'Cliente anónimo'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {getWaiterName(propina.waiter)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(propina.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(propina.total)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-700">
                            {formatCurrency(propina.tip)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista de tarjetas para pantallas medianas y pequeñas */}
              <div className="lg:hidden space-y-3 p-3">
                {propinasFiltradas.map((propina) => {
                  const percentage = propina.total > 0 
                    ? ((propina.tip / propina.total) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <div 
                      key={propina._id}
                      onClick={() => handleViewDetail(propina)}
                      className="bg-white bg-opacity-80 rounded-lg border border-amber-200 p-3 shadow-sm cursor-pointer hover:bg-opacity-100 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">
                            Orden #{propina.orderNumber}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {propina.name || propina.buyer?.name || 'Cliente anónimo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(propina.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(propina.total)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-700">
                              {getWaiterName(propina.waiter)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-700">
                              {formatCurrency(propina.tip)}
                            </p>
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de detalle */}
      {showDetailModal && selectedOrder && (
        <VentaDetailModal
          venta={selectedOrder}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          onVentaUpdated={(updatedOrder) => {
            // Actualizar la orden en la lista local
            refetch();
            setSelectedOrder(updatedOrder);
          }}
          products={products}
          productsLoading={productsLoading}
        />
      )}
    </div>
  );
};

export default Propinas;
