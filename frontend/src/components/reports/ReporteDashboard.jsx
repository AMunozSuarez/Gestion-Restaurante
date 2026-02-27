import React, { useEffect, useMemo } from 'react';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    BanknotesIcon,
    ShoppingCartIcon,
    TicketIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { useReportDashboard } from '../../hooks/useReports';
import { formatChileanCurrency } from '../../utils/dateUtils';


// ─── Mini-chart de barras horizontal ──────────────────────────────────────────

const MiniBar = ({ value, max, color = 'bg-green-500' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-green-600', bgColor = 'bg-green-50', change }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{title}</span>
            <div className={`${bgColor} p-2 rounded-xl`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <div className="flex items-center gap-2">
            {change !== null && change !== undefined && (
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${Number(change) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {Number(change) >= 0 ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
                    {Math.abs(Number(change))}%
                </span>
            )}
            {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
    </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const ReporteDashboard = () => {
    const { data, isLoading, error, fetch } = useReportDashboard();

    useEffect(() => { fetch(); }, [fetch]);

    // Hooks deben ir siempre antes de los early returns
    const maxDayTotal = useMemo(() => Math.max(...((data?.weekTrend) || []).map(d => d.total), 1), [data?.weekTrend]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 py-12">{error}</div>;
    }

    if (!data) return null;

    const { today, week, month, todayTopProducts, weekTrend } = data;

    const dayLabels = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
    const getDayLabel = (dateStr) => {
        const d = new Date(dateStr + 'T12:00:00');
        return dayLabels[d.getDay()] || dateStr;
    };

    return (
        <div className="space-y-6">
            {/* KPIs de hoy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Ventas Hoy"
                    value={formatChileanCurrency(today.sales)}
                    subtitle="vs ayer"
                    icon={BanknotesIcon}
                    color="text-green-600"
                    bgColor="bg-green-50"
                    change={today.salesChange}
                />
                <StatCard
                    title="Pedidos Hoy"
                    value={today.orders}
                    subtitle={`Ticket promedio: ${formatChileanCurrency(today.avgTicket)}`}
                    icon={ShoppingCartIcon}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <StatCard
                    title="Propinas Hoy"
                    value={formatChileanCurrency(today.tips)}
                    icon={TicketIcon}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                />
                <StatCard
                    title="Cancelados Hoy"
                    value={today.cancelled}
                    icon={XCircleIcon}
                    color="text-red-500"
                    bgColor="bg-red-50"
                />
            </div>

            {/* Resumen semanal y mensual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Últimos 7 días</h3>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(week.total)}</p>
                    <p className="text-xs text-gray-400">{week.count} pedidos</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Últimos 30 días</h3>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(month.total)}</p>
                    <p className="text-xs text-gray-400">{month.count} pedidos</p>
                </div>
            </div>

            {/* Tendencia semanal + Top productos hoy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tendencia semanal */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Tendencia últimos 7 días</h3>
                    {weekTrend && weekTrend.length > 0 ? (
                        <div className="space-y-3">
                            {weekTrend.map((day) => (
                                <div key={day._id} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500 w-10 text-right font-medium">{getDayLabel(day._id)}</span>
                                    <div className="flex-1">
                                        <MiniBar value={day.total} max={maxDayTotal} color="bg-green-500" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 w-24 text-right">{formatChileanCurrency(day.total)}</span>
                                    <span className="text-xs text-gray-400 w-16 text-right">{day.count} ped.</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Sin datos disponibles</p>
                    )}
                </div>

                {/* Top productos hoy */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Productos de Hoy</h3>
                    {todayTopProducts && todayTopProducts.length > 0 ? (
                        <div className="space-y-3">
                            {todayTopProducts.map((item, i) => (
                                <div key={item._id} className="flex items-center gap-3">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                        i === 0 ? 'bg-amber-100 text-amber-700' :
                                        i === 1 ? 'bg-gray-100 text-gray-600' :
                                        i === 2 ? 'bg-orange-100 text-orange-600' :
                                        'bg-gray-50 text-gray-400'
                                    }`}>
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 text-sm text-gray-800 truncate">{item.name || 'Producto eliminado'}</span>
                                    <span className="text-sm font-semibold text-gray-700">{item.qty} unid.</span>
                                    <span className="text-xs text-gray-400">{formatChileanCurrency(item.price)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Sin ventas hoy</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReporteDashboard;
