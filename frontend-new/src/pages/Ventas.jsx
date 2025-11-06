import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useSales } from '../hooks/useSales';
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

  // Hook para obtener TODAS las ventas del restaurante (sin filtro de caja)
  const { sales: ventas, isLoading, error, refetch: fetchSales } = useSales({
    status: statusFilter === 'all' ? undefined : statusFilter,
    section: sectionFilter === 'all' ? undefined : sectionFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined
  });

  // Filtrar ventas según criterios usando useMemo para optimización
  const ventasFiltradas = useMemo(() => {
    return ventas.filter(venta => {
      let matches = true;

      // Los filtros de fecha, estado y sección ya se manejan en el backend
      // Solo aplicamos filtros adicionales aquí

      // Filtro por método de pago
      if (paymentMethodFilter !== 'all') {
        matches = matches && venta.payment === paymentMethodFilter;
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
    const completedVentas = ventasFiltradas.filter(v => v.status === 'Completado');
    const canceledVentas = ventasFiltradas.filter(v => v.status === 'Cancelado');
    
    const totalMonto = completedVentas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const montoEfectivo = completedVentas.filter(v => v.payment === 'Efectivo').reduce((sum, v) => sum + (v.total || 0), 0);
    const montoTarjeta = completedVentas.filter(v => v.payment === 'Debito').reduce((sum, v) => sum + (v.total || 0), 0);
    const montoTransferencia = completedVentas.filter(v => v.payment === 'Transferencia').reduce((sum, v) => sum + (v.total || 0), 0);

    return {
      totalVentas: ventasFiltradas.length,
      totalMonto,
      ventasCompletadas: completedVentas.length,
      ventasCanceladas: canceledVentas.length,
      montoEfectivo,
      montoTarjeta,
      montoTransferencia
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
  };

  // Exportar datos (simulado)
  const handleExport = () => {
    console.log('Exportando datos...', ventasFiltradas);
    // Aquí se implementaría la lógica de exportación
  };

  return (
    <div className="h-full bg-professional flex justify-center gap-4 p-4 overflow-hidden">
      {/* Contenido Principal */}
      <div className="w-full max-w-6xl flex flex-col gap-3">
        {/* Header */}
        <div className="card-professional p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-professional-title">Ventas y Pedidos</h1>
              <p className="text-professional-body mt-1">Gestiona y analiza todas las ventas del restaurante</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="btn-professional-secondary flex items-center gap-2"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Panel de filtros */}
        <div className="card-professional p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-professional-subtitle">Filtros</h3>
            <button
              onClick={clearFilters}
              className="btn-professional-outline text-xs"
            >
              Limpiar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-professional-body mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-professional-body mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-professional-body mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
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
              <label className="block text-xs font-medium text-professional-body mb-2">
                Método de Pago
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
              >
                <option value="all">Todos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Debito">Débito</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-professional-body mb-2">
                Sección
              </label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
              >
                <option value="all">Todas</option>
                <option value="mostrador">Mostrador</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-professional-body mb-2">
                Buscar cliente/ID
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cliente o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel de estadísticas */}
        <div className="card-professional p-3 flex-shrink-0">
          <h3 className="text-professional-subtitle mb-2">Resumen</h3>
          <div className="grid grid-cols-5 gap-2">
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
          </div>
        </div>

        {/* Lista de ventas */}
        <div className="card-professional flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-opacity-20 border-amber-300 flex-shrink-0">
            <h2 className="text-professional-subtitle">Lista de Ventas</h2>
            <p className="text-professional-body mt-1">Total de {ventasFiltradas.length} ventas encontradas</p>
          </div>

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
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Método de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body">
                        {venta.name || venta.buyer?.name || 'Cliente anónimo'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body">
                        {formatDate(venta.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          venta.status === 'Completado' 
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          venta.payment === 'Efectivo'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : venta.payment === 'Debito'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {venta.payment === 'Debito' ? 'Débito' : venta.payment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-professional-body font-medium">
                        {formatCurrency(venta.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        />
      )}
    </div>
  );
};

export default Ventas;