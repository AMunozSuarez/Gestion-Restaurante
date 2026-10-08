import React, { useEffect, useState } from 'react';
import {
    BookmarkIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useReportTags } from '../../hooks/useReports';
import { getChileToday, getChileDateWithOffset, formatChileanCurrency } from '../../utils/dateUtils';

const MiniBar = ({ value, max, color = 'bg-teal-500' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const ReporteEtiquetas = () => {
    const today = getChileToday();
    const monthAgo = getChileDateWithOffset(-30);

    const [startDate, setStartDate] = useState(monthAgo);
    const [endDate, setEndDate] = useState(today);
    const [selectedTagIds, setSelectedTagIds] = useState([]);

    const { data, isLoading, error, fetch } = useReportTags();

    useEffect(() => {
        fetch({
            startDate,
            endDate,
            limit: 50,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
        });
    }, [fetch, startDate, endDate, selectedTagIds]);

    const handleQuickRange = (days) => {
        setStartDate(getChileDateWithOffset(-days));
        setEndDate(today);
    };

    const toggleTagSelection = (tagId) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
        );
    }

    if (error) return <div className="text-center text-red-500 py-12">{error}</div>;
    if (!data) return null;

    const { salesByTag = [], orderDistribution = [], selectedTagsTotal } = data;

    const withTag = orderDistribution?.find(d => d._id === 'con_etiqueta') || { count: 0, total: 0 };
    const withoutTag = orderDistribution?.find(d => d._id === 'sin_etiqueta') || { count: 0, total: 0 };
    const totalOrders = withTag.count + withoutTag.count;

    const maxSpend = Math.max(...(salesByTag || []).map(t => t.totalSpent), 1);

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

            {/* Distribución con/sin etiqueta */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Ventas con vs sin Etiqueta</h3>
                <div className="flex gap-6">
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Con etiqueta</span>
                            <span className="font-semibold text-gray-700">{withTag.count} ({totalOrders > 0 ? Math.round((withTag.count / totalOrders) * 100) : 0}%)</span>
                        </div>
                        <MiniBar value={withTag.count} max={totalOrders} color="bg-teal-500" />
                        <p className="text-xs text-gray-400 mt-0.5">{formatChileanCurrency(withTag.total)}</p>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Sin etiqueta</span>
                            <span className="font-semibold text-gray-700">{withoutTag.count} ({totalOrders > 0 ? Math.round((withoutTag.count / totalOrders) * 100) : 0}%)</span>
                        </div>
                        <MiniBar value={withoutTag.count} max={totalOrders} color="bg-gray-400" />
                        <p className="text-xs text-gray-400 mt-0.5">{formatChileanCurrency(withoutTag.total)}</p>
                    </div>
                </div>
            </div>

            {/* Total combinado de etiquetas seleccionadas */}
            {selectedTagIds.length > 0 && selectedTagsTotal && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-teal-600" />
                        <span className="text-sm font-medium text-teal-800">
                            {selectedTagIds.length} etiqueta{selectedTagIds.length !== 1 ? 's' : ''} seleccionada{selectedTagIds.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => setSelectedTagIds([])}
                            className="text-xs text-teal-700 underline hover:text-teal-900"
                        >
                            Limpiar selección
                        </button>
                    </div>
                    <div className="flex gap-6">
                        <div>
                            <p className="text-xs text-teal-700">Total combinado</p>
                            <p className="text-lg font-bold text-teal-900">{formatChileanCurrency(selectedTagsTotal.totalSpent || 0)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-teal-700">Ventas</p>
                            <p className="text-lg font-bold text-teal-900">{selectedTagsTotal.orderCount || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ranking de etiquetas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <BookmarkIcon className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Ventas por Etiqueta</h3>
                    <span className="text-xs text-gray-400 ml-auto">Marca una o más para ver el total combinado</span>
                </div>
                <div className="divide-y divide-gray-50">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <span className="col-span-1"></span>
                        <span className="col-span-4">Etiqueta</span>
                        <span className="col-span-2 text-right">Total Vendido</span>
                        <span className="col-span-2 text-right">Ventas</span>
                        <span className="col-span-1 text-right">Ticket Prom.</span>
                        <span className="col-span-2"></span>
                    </div>
                    {salesByTag && salesByTag.length > 0 ? salesByTag.map((item) => (
                        <div key={item._id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                            <div className="col-span-1">
                                <input
                                    type="checkbox"
                                    checked={selectedTagIds.includes(item._id)}
                                    onChange={() => toggleTagSelection(item._id)}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                            </div>
                            <span className="col-span-4 text-sm font-medium text-gray-800 truncate flex items-center gap-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: item.tag?.color || '#0d9488' }}
                                />
                                {item.tag?.name || 'Sin nombre'}
                            </span>
                            <span className="col-span-2 text-sm font-semibold text-teal-700 text-right">{formatChileanCurrency(item.totalSpent)}</span>
                            <span className="col-span-2 text-sm text-gray-600 text-right">{item.orderCount}</span>
                            <span className="col-span-1 text-xs text-gray-500 text-right">{formatChileanCurrency(Math.round(item.avgTicket || 0))}</span>
                            <div className="col-span-2">
                                <MiniBar value={item.totalSpent} max={maxSpend} color="bg-teal-500" />
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-400 text-center py-8">Sin ventas etiquetadas en este período</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReporteEtiquetas;
