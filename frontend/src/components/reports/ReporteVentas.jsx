import React, { useEffect, useState } from 'react';
import {
    BanknotesIcon,
    ShoppingCartIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { useReportSales } from '../../hooks/useReports';
import { getChileToday, getChileDateWithOffset, formatChileanCurrency } from '../../utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MiniBar = ({ value, max, color = 'bg-green-500' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const sectionLabels = {
    mostrador: 'Mostrador',
    delivery: 'Delivery',
    mesas: 'Mesas',
};

const sectionColors = {
    mostrador: 'bg-green-500',
    delivery: 'bg-blue-500',
    mesas: 'bg-amber-500',
};

const paymentLabels = {
    Efectivo: 'Efectivo',
    Debito: 'Débito',
    Transferencia: 'Transferencia',
    Múltiple: 'Múltiple',
    Pendiente: 'Pendiente',
    '': 'Sin definir',
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ReporteVentas = () => {
    const today = getChileToday();
    const weekAgo = getChileDateWithOffset(-7);

    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(today);

    const { data, isLoading, error, fetch } = useReportSales();

    useEffect(() => {
        fetch({ startDate, endDate });
    }, [fetch, startDate, endDate]);

    const handleQuickRange = (days) => {
        setStartDate(getChileDateWithOffset(-days));
        setEndDate(today);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
        );
    }

    if (error) return <div className="text-center text-red-500 py-12">{error}</div>;
    if (!data) return null;

    const { summary, salesBySection, salesByPayment, salesByDay, salesByHour } = data;

    const maxDayTotal = Math.max(...(salesByDay || []).map(d => d.total), 1);
    const maxHourTotal = Math.max(...(salesByHour || []).map(h => h.total), 1);

    const dayLabels = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
    const getDayLabel = (dateStr) => {
        const d = new Date(dateStr + 'T12:00:00');
        return dayLabels[d.getDay()] || dateStr;
    };

    return (
        <div className="space-y-6">
            {/* Filtros de fecha */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { label: 'Hoy', days: 0 },
                            { label: '7 días', days: 7 },
                            { label: '30 días', days: 30 },
                            { label: '90 días', days: 90 },
                        ].map(r => (
                            <button key={r.label} onClick={() => handleQuickRange(r.days)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors">
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <BanknotesIcon className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-500">Total Ventas</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(summary.totalSales)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingCartIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-500">Pedidos</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{summary.totalOrders}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Ticket Promedio</span>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(Math.round(summary.avgTicket || 0))}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Propinas</span>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(summary.totalTips || 0)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Costo Delivery</span>
                    <p className="text-xl font-bold text-gray-900">{formatChileanCurrency(summary.totalDeliveryCost || 0)}</p>
                </div>
            </div>

            {/* Por Sección y Método de Pago */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Por sección */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas por Sección</h3>
                    {salesBySection && salesBySection.length > 0 ? (
                        <div className="space-y-4">
                            {salesBySection.map(item => {
                                const maxSec = Math.max(...salesBySection.map(s => s.total), 1);
                                return (
                                    <div key={item._id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{sectionLabels[item._id] || item._id}</span>
                                            <span className="text-gray-500">{formatChileanCurrency(item.total)} · {item.count} ped.</span>
                                        </div>
                                        <MiniBar value={item.total} max={maxSec} color={sectionColors[item._id] || 'bg-gray-400'} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                    )}
                </div>

                {/* Por método de pago */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas por Método de Pago</h3>
                    {salesByPayment && salesByPayment.length > 0 ? (
                        <div className="space-y-4">
                            {salesByPayment.map(item => {
                                const maxPay = Math.max(...salesByPayment.map(s => s.total), 1);
                                const colors = {
                                    Efectivo: 'bg-green-500',
                                    Debito: 'bg-blue-500',
                                    Transferencia: 'bg-purple-500',
                                    Múltiple: 'bg-amber-500',
                                    Pendiente: 'bg-gray-400',
                                };
                                return (
                                    <div key={item._id || 'none'}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{paymentLabels[item._id] || item._id || 'Sin definir'}</span>
                                            <span className="text-gray-500">{formatChileanCurrency(item.total)} · {item.count} ped.</span>
                                        </div>
                                        <MiniBar value={item.total} max={maxPay} color={colors[item._id] || 'bg-gray-400'} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                    )}
                </div>
            </div>

            {/* Ventas por día */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas por Día</h3>
                {salesByDay && salesByDay.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {salesByDay.map(day => (
                            <div key={day._id} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-20 text-right font-medium">
                                    {getDayLabel(day._id)} {day._id.slice(5)}
                                </span>
                                <div className="flex-1">
                                    <MiniBar value={day.total} max={maxDayTotal} color="bg-green-500" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-24 text-right">{formatChileanCurrency(day.total)}</span>
                                <span className="text-xs text-gray-400 w-12 text-right">{day.count} ped.</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                )}
            </div>

            {/* Ventas por hora */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    <ClockIcon className="w-4 h-4 inline mr-1 -mt-0.5" />
                    Distribución por Hora del Día
                </h3>
                {salesByHour && salesByHour.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {salesByHour.map(h => (
                            <div key={h._id} className="text-center">
                                <div className="relative h-20 flex items-end justify-center mb-1">
                                    <div
                                        className="w-8 bg-green-400 rounded-t-md transition-all duration-500"
                                        style={{ height: `${Math.max((h.total / maxHourTotal) * 100, 4)}%` }}
                                    />
                                </div>
                                <p className="text-xs font-semibold text-gray-700">{String(h._id).padStart(2, '0')}:00</p>
                                <p className="text-xs text-gray-400">{formatChileanCurrency(h.total)}</p>
                                <p className="text-xs text-gray-300">{h.count} ped.</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                )}
            </div>
        </div>
    );
};

export default ReporteVentas;
