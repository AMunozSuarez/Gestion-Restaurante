import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useSales } from '../hooks/useSales';
import { useProducts } from '../hooks/useProducts';
import VentaDetailModal from '../components/common/VentaDetailModal';
import { getChileToday, formatChileDateTime, formatChileanCurrency } from '../utils/dateUtils';

const Ventas = () => {
  // Obtener fecha de hoy en zona horaria de Chile
  const today = getChileToday();
  
  // Estados para filtros - Por defecto filtrar por hoy
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modal de detalle
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Estados para colapsar paneles
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // Hook para obtener TODAS las ventas del restaurante (sin filtro de caja)
  const { sales: ventas, isLoading, error, refetch: fetchSales } = useSales({
    status: statusFilter === 'all' ? undefined : statusFilter,
    section: sectionFilter === 'all' ? undefined : sectionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined
  });

  // Hook para obtener productos
  const { products, isLoading: productsLoading } = useProducts();

  // Filtrar ventas según criterios usando useMemo para optimización
  const ventasFiltradas = useMemo(() => {
    return ventas.filter(venta => {
      let matches = true;

      // Los filtros de fecha, estado y sección ya se manejan en el backend
      // Solo aplicamos filtros adicionales aquí

      // Filtro por método de pago
      if (paymentMethodFilter !== 'all') {
        // Verificar si la venta tiene el método de pago especificado
        if (venta.paymentMethods && venta.paymentMethods.length > 0) {
          matches = matches && venta.paymentMethods.some(pm => pm.method === paymentMethodFilter);
        } else {
          // Compatibilidad con el campo payment antiguo
          matches = matches && venta.payment === paymentMethodFilter;
        }
      }

      // Filtro por búsqueda (cliente o ID)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        matches = matches && (
          venta.name?.toLowerCase().includes(term) ||
          venta.buyer?.name?.toLowerCase().includes(term) ||
          venta._id?.toLowerCase().includes(term) ||
          venta.id?.toString().includes(term)
        );
      }

      return matches;
    });
  }, [ventas, paymentMethodFilter, searchTerm]);

  // Calcular estadísticas usando useMemo para optimización
  const stats = useMemo(() => {
    const completedVentas = ventasFiltradas.filter(v => ['Completado', 'Enviado'].includes(v.status));
    const canceledVentas = ventasFiltradas.filter(v => v.status === 'Cancelado');
    
    const totalMonto = completedVentas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    
    // Calcular montos por método de pago usando la nueva estructura paymentMethods
    let montoEfectivo = 0;
    let montoTarjeta = 0;
    let montoTransferencia = 0;
    let montoDelivery = 0;
    
    completedVentas.forEach(venta => {
      // Calcular monto de delivery
      if (venta.section === 'delivery' && venta.deliveryCost) {
        montoDelivery += venta.deliveryCost || 0;
      }
      
      if (venta.paymentMethods && venta.paymentMethods.length > 0) {
        // Nueva estructura con múltiples métodos de pago
        venta.paymentMethods.forEach(pm => {
          if (pm.method === 'Efectivo') {
            montoEfectivo += pm.amount || 0;
          } else if (pm.method === 'Debito') {
            montoTarjeta += pm.amount || 0;
          } else if (pm.method === 'Transferencia') {
            montoTransferencia += pm.amount || 0;
          }
        });
      } else if (venta.payment) {
        // Compatibilidad con estructura antigua
        const amount = venta.total || 0;
        if (venta.payment === 'Efectivo') {
          montoEfectivo += amount;
        } else if (venta.payment === 'Debito') {
          montoTarjeta += amount;
        } else if (venta.payment === 'Transferencia') {
          montoTransferencia += amount;
        }
      }
    });

    return {
      totalVentas: ventasFiltradas.length,
      totalMonto,
      ventasCompletadas: completedVentas.length,
      ventasCanceladas: canceledVentas.length,
      montoEfectivo,
      montoTarjeta,
      montoTransferencia,
      montoDelivery
    };
  }, [ventasFiltradas]);

  // Mostrar loading inicial
  if (isLoading && ventas.length === 0) {
    return (
      <div className="h-full bg-professional flex items-center justify-center">
        <div className="text-center">
          <div className="loading-professional mx-auto mb-4"></div>
          <p className="text-professional-body">Cargando información de ventas...</p>
        </div>
      </div>
    );
  }

  // Formatear fecha para mostrar en zona horaria de Chile
  const formatDate = (dateString) => {
    return formatChileDateTime(dateString);
  };

  // Formatear moneda chilena
  const formatCurrency = (amount) => {
    return formatChileanCurrency(amount);
  };

  // Renderizar métodos de pago
  const renderPaymentMethods = (venta) => {
    if (venta.paymentMethods && venta.paymentMethods.length > 0) {
      if (venta.paymentMethods.length === 1) {
        // Un solo método de pago
        const pm = venta.paymentMethods[0];
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            pm.method === 'Efectivo'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : pm.method === 'Debito'
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {pm.method === 'Debito' ? 'Débito' : pm.method}
          </span>
        );
      } else {
        // Múltiples métodos de pago
        return (
          <div className="flex flex-wrap gap-1">
            {venta.paymentMethods.map((pm, index) => (
              <span key={pm._id || index} className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded ${
                pm.method === 'Efectivo'
                  ? 'bg-green-100 text-green-800'
                  : pm.method === 'Debito'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {pm.method === 'Debito' ? 'Déb' : pm.method.slice(0, 3)}
              </span>
            ))}
          </div>
        );
      }
    } else if (venta.payment) {
      // Compatibilidad con estructura antigua
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          venta.payment === 'Efectivo'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : venta.payment === 'Debito'
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          {venta.payment === 'Debito' ? 'Débito' : venta.payment}
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Sin especificar
        </span>
      );
    }
  };

  // Abrir modal de detalle
  const handleViewDetail = (venta) => {
    setSelectedVenta(venta);
    setShowDetailModal(true);
  };

  // Limpiar filtros
  const clearFilters = () => {
    const todayDate = getChileToday();
    setDateFrom(todayDate);
    setDateTo(todayDate);
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setSectionFilter('all');
    setSearchTerm('');
    setFiltersCollapsed(false);
    setSummaryCollapsed(false);
  };

  // Exportar datos (simulado)
  const handleExport = () => {
    console.log('Exportando datos...', ventasFiltradas);
    // Aquí se implementaría la lógica de exportación
  };

  return (
    <div className="h-full bg-professional flex justify-center gap-4 p-2 lg:p-4 overflow-hidden">
      {/* Contenido Principal */}
      <div className="w-full max-w-7xl flex flex-col gap-2 lg:gap-3">
        {/* Header - Más compacto */}
        <div className="card-professional p-3 lg:p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-amber-800">Ventas y Pedidos</h1>
              <p className="text-sm text-gray-600 mt-1 hidden lg:block">
                Gestiona y analiza todas las ventas del restaurante
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="btn-professional-secondary flex items-center gap-2 text-sm px-3 py-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Exportar
              </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3">
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
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="Preparacion">Preparación</option>
                  <option value="En camino">En camino</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pago
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Debito">Débito</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sección
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="mostrador">Mostrador</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nombre cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full px-2 py-1.5 lg:px-3 lg:py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-lg border border-gray-200 text-center">
                <p className="text-xs text-gray-700 font-medium">Total</p>
                <p className="text-sm font-bold text-gray-800">{stats.totalVentas}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-700 font-medium">Monto</p>
                <p className="text-sm font-bold text-green-800">{formatCurrency(stats.totalMonto)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded-lg border border-blue-200 text-center">
                <p className="text-xs text-blue-700 font-medium">Efectivo</p>
                <p className="text-sm font-bold text-blue-800">{formatCurrency(stats.montoEfectivo)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 rounded-lg border border-purple-200 text-center">
                <p className="text-xs text-purple-700 font-medium">Débito</p>
                <p className="text-sm font-bold text-purple-800">{formatCurrency(stats.montoTarjeta)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-2 rounded-lg border border-amber-200 text-center">
                <p className="text-xs text-amber-700 font-medium">Transfer.</p>
                <p className="text-sm font-bold text-amber-800">{formatCurrency(stats.montoTransferencia)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-2 rounded-lg border border-orange-200 text-center">
                <p className="text-xs text-orange-700 font-medium">Delivery</p>
                <p className="text-sm font-bold text-orange-800">{formatCurrency(stats.montoDelivery)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lista de ventas */}
        <div className="card-professional flex-1 flex flex-col overflow-hidden min-h-0">

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="loading-professional mx-auto mb-4"></div>
                <p className="text-professional-body">Cargando ventas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchSales}
                  className="btn-professional-outline"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-professional-body">No se encontraron ventas con los filtros aplicados</p>
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
                        Cliente
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Sección
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Método de Pago
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white bg-opacity-50 divide-y divide-amber-100">
                    {ventasFiltradas.map((venta) => (
                      <tr 
                        key={venta._id || venta.id} 
                        className="hover:bg-amber-50 hover:bg-opacity-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(venta)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {venta.name || venta.buyer?.name || 'Cliente anónimo'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(venta.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            venta.section === 'delivery'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {venta.section === 'delivery' ? 'Delivery' : 'Mostrador'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ['Completado', 'Enviado'].includes(venta.status)
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : venta.status === 'Preparacion'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : venta.status === 'Cancelado'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {venta.status === 'Preparacion' ? 'Preparación' : venta.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderPaymentMethods(venta)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(venta.total)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(venta);
                            }}
                            className="text-amber-600 hover:text-amber-800 font-medium"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de tarjetas para pantallas medianas y pequeñas */}
              <div className="lg:hidden space-y-3 p-3">
                {ventasFiltradas.map((venta) => (
                  <div 
                    key={venta._id || venta.id} 
                    className="bg-white bg-opacity-80 rounded-lg border border-amber-200 p-3 hover:bg-opacity-100 transition-all cursor-pointer shadow-sm"
                    onClick={() => handleViewDetail(venta)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {venta.name || venta.buyer?.name || 'Cliente anónimo'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatDate(venta.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            venta.section === 'delivery'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {venta.section === 'delivery' ? 'Delivery' : 'Mostrador'}
                          </span>
                        </div>
                        <p className="font-semibold text-amber-700">
                          {formatCurrency(venta.total)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ['Completado', 'Enviado'].includes(venta.status)
                            ? 'bg-green-100 text-green-800'
                            : venta.status === 'Preparacion'
                            ? 'bg-yellow-100 text-yellow-800'
                            : venta.status === 'Cancelado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {venta.status === 'Preparacion' ? 'Prep.' : venta.status}
                        </span>
                        
                        {renderPaymentMethods(venta)}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(venta);
                        }}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium bg-amber-50 px-2 py-1 rounded"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedVenta && (
        <VentaDetailModal
          venta={selectedVenta}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedVenta(null);
          }}
          onVentaUpdated={(updatedVenta) => {
            // Actualizar la venta en la lista local
            fetchSales();
            setSelectedVenta(updatedVenta);
          }}
          products={products}
          productsLoading={productsLoading}
        />
      )}
    </div>
  );
};

export default Ventas;