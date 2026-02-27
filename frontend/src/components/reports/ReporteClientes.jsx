import React, { useEffect, useState } from 'react';
import {
    UserGroupIcon,
    UserPlusIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useReportCustomers } from '../../hooks/useReports';
import { getChileToday, getChileDateWithOffset, formatChileanCurrency, formatChileDate } from '../../utils/dateUtils';

const MiniBar = ({ value, max, color = 'bg-green-500' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const ReporteClientes = () => {
    const today = getChileToday();
    const monthAgo = getChileDateWithOffset(-30);

    const [startDate, setStartDate] = useState(monthAgo);
    const [endDate, setEndDate] = useState(today);
    const [activeTab, setActiveTab] = useState('spend');

    const { data, isLoading, error, fetch } = useReportCustomers();

    useEffect(() => {
        fetch({ startDate, endDate, limit: 20 });
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

    const {
        topCustomersBySpend,
        topCustomersByFrequency,
        newCustomersByDay,
        totalCustomers,
        customerStats,
        orderDistribution,
    } = data;

    const tabs = [
        { id: 'spend', label: 'Mayor Gasto', icon: CurrencyDollarIcon },
        { id: 'frequency', label: 'Más Frecuentes', icon: UserGroupIcon },
        { id: 'new', label: 'Nuevos Clientes', icon: UserPlusIcon },
    ];

    // Distribución con/sin cliente
    const withClient = orderDistribution?.find(d => d._id === 'con_cliente') || { count: 0, total: 0 };
    const withoutClient = orderDistribution?.find(d => d._id === 'sin_cliente') || { count: 0, total: 0 };
    const totalOrders = withClient.count + withoutClient.count;

    const maxSpend = Math.max(...(topCustomersBySpend || []).map(c => c.totalSpent), 1);
    const maxFreq = Math.max(...(topCustomersByFrequency || []).map(c => c.orderCount), 1);
    const maxNewDay = Math.max(...(newCustomersByDay || []).map(d => d.count), 1);

    return (
        <div className="space-y-6">
            {/* Filtros */}
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

            {/* KPIs de clientes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <UserGroupIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-500">Total Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Clientes Activos (período)</span>
                    <p className="text-2xl font-bold text-gray-900">{customerStats.uniqueCustomers}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Promedio Pedidos/Cliente</span>
                    <p className="text-2xl font-bold text-gray-900">{(customerStats.avgOrdersPerCustomer || 0).toFixed(1)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <span className="text-xs font-medium text-gray-500">Gasto Prom./Cliente</span>
                    <p className="text-2xl font-bold text-gray-900">{formatChileanCurrency(Math.round(customerStats.avgSpendPerCustomer || 0))}</p>
                </div>
            </div>

            {/* Distribución con/sin cliente */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pedidos con vs sin Cliente Registrado</h3>
                <div className="flex gap-6">
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Con cliente</span>
                            <span className="font-semibold text-gray-700">{withClient.count} ({totalOrders > 0 ? Math.round((withClient.count / totalOrders) * 100) : 0}%)</span>
                        </div>
                        <MiniBar value={withClient.count} max={totalOrders} color="bg-green-500" />
                        <p className="text-xs text-gray-400 mt-0.5">{formatChileanCurrency(withClient.total)}</p>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Sin cliente</span>
                            <span className="font-semibold text-gray-700">{withoutClient.count} ({totalOrders > 0 ? Math.round((withoutClient.count / totalOrders) * 100) : 0}%)</span>
                        </div>
                        <MiniBar value={withoutClient.count} max={totalOrders} color="bg-gray-400" />
                        <p className="text-xs text-gray-400 mt-0.5">{formatChileanCurrency(withoutClient.total)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}>
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Contenido */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Top por gasto */}
                {activeTab === 'spend' && (
                    <div className="divide-y divide-gray-50">
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            <span className="col-span-1">#</span>
                            <span className="col-span-3">Cliente</span>
                            <span className="col-span-2">Teléfono</span>
                            <span className="col-span-2 text-right">Total Gastado</span>
                            <span className="col-span-1 text-right">Pedidos</span>
                            <span className="col-span-2 text-right">Ticket Prom.</span>
                            <span className="col-span-1"></span>
                        </div>
                        {topCustomersBySpend && topCustomersBySpend.length > 0 ? topCustomersBySpend.map((item, i) => (
                            <div key={item._id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                                <span className={`col-span-1 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                    i === 0 ? 'bg-amber-100 text-amber-700' :
                                    i === 1 ? 'bg-gray-200 text-gray-600' :
                                    i === 2 ? 'bg-orange-100 text-orange-600' :
                                    'text-gray-400'
                                }`}>{i + 1}</span>
                                <span className="col-span-3 text-sm font-medium text-gray-800 truncate">{item.customer?.name || 'Sin nombre'}</span>
                                <span className="col-span-2 text-xs text-gray-500">{item.customer?.phone || '-'}</span>
                                <span className="col-span-2 text-sm font-semibold text-green-700 text-right">{formatChileanCurrency(item.totalSpent)}</span>
                                <span className="col-span-1 text-sm text-gray-600 text-right">{item.orderCount}</span>
                                <span className="col-span-2 text-xs text-gray-500 text-right">{formatChileanCurrency(Math.round(item.avgTicket || 0))}</span>
                                <div className="col-span-1">
                                    <MiniBar value={item.totalSpent} max={maxSpend} color="bg-green-500" />
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
                        )}
                    </div>
                )}

                {/* Top por frecuencia */}
                {activeTab === 'frequency' && (
                    <div className="divide-y divide-gray-50">
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            <span className="col-span-1">#</span>
                            <span className="col-span-3">Cliente</span>
                            <span className="col-span-2">Teléfono</span>
                            <span className="col-span-2 text-right">Pedidos</span>
                            <span className="col-span-2 text-right">Total Gastado</span>
                            <span className="col-span-1 text-right">Último</span>
                            <span className="col-span-1"></span>
                        </div>
                        {topCustomersByFrequency && topCustomersByFrequency.length > 0 ? topCustomersByFrequency.map((item, i) => (
                            <div key={item._id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                                <span className={`col-span-1 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                    i === 0 ? 'bg-blue-100 text-blue-700' :
                                    i === 1 ? 'bg-gray-200 text-gray-600' :
                                    i === 2 ? 'bg-blue-50 text-blue-500' :
                                    'text-gray-400'
                                }`}>{i + 1}</span>
                                <span className="col-span-3 text-sm font-medium text-gray-800 truncate">{item.customer?.name || 'Sin nombre'}</span>
                                <span className="col-span-2 text-xs text-gray-500">{item.customer?.phone || '-'}</span>
                                <span className="col-span-2 text-sm font-semibold text-blue-700 text-right">{item.orderCount}</span>
                                <span className="col-span-2 text-sm text-gray-600 text-right">{formatChileanCurrency(item.totalSpent)}</span>
                                <span className="col-span-1 text-xs text-gray-400 text-right">{item.lastOrder ? formatChileDate(item.lastOrder) : '-'}</span>
                                <div className="col-span-1">
                                    <MiniBar value={item.orderCount} max={maxFreq} color="bg-blue-500" />
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
                        )}
                    </div>
                )}

                {/* Nuevos clientes */}
                {activeTab === 'new' && (
                    <div className="p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Nuevos clientes registrados por día</h3>
                        {newCustomersByDay && newCustomersByDay.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {newCustomersByDay.map(day => (
                                    <div key={day._id} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-24 text-right font-medium">{formatChileDate(day._id + 'T12:00:00')}</span>
                                        <div className="flex-1">
                                            <MiniBar value={day.count} max={maxNewDay} color="bg-blue-500" />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 w-16 text-right">{day.count} nuevo{day.count !== 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin nuevos clientes en este período</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReporteClientes;
