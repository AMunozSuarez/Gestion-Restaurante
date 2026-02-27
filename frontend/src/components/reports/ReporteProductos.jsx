import React, { useEffect, useState } from 'react';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
import { useReportProducts } from '../../hooks/useReports';
import { getChileToday, getChileDateWithOffset, formatChileanCurrency } from '../../utils/dateUtils';

const MiniBar = ({ value, max, color = 'bg-green-500' }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const ReporteProductos = () => {
    const today = getChileToday();
    const monthAgo = getChileDateWithOffset(-30);

    const [startDate, setStartDate] = useState(monthAgo);
    const [endDate, setEndDate] = useState(today);
    const [activeTab, setActiveTab] = useState('top');
    const [sortBy, setSortBy] = useState('revenue'); // 'revenue' | 'quantity'

    const { data, isLoading, error, fetch } = useReportProducts();

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

    const { topProducts, leastProducts, salesByCategory, neverSold } = data;

    const tabs = [
        { id: 'top', label: 'Más Vendidos', icon: ArrowTrendingUpIcon, count: topProducts?.length },
        { id: 'least', label: 'Menos Vendidos', icon: ArrowTrendingDownIcon, count: leastProducts?.length },
        { id: 'category', label: 'Por Categoría', icon: TagIcon, count: salesByCategory?.length },
        { id: 'never', label: 'Sin Ventas', icon: ExclamationTriangleIcon, count: neverSold?.length },
    ];

    const maxTopQty = Math.max(...(topProducts || []).map(p => p.totalQuantity), 1);
    const maxTopRevenue = Math.max(...(topProducts || []).map(p => p.totalRevenue), 1);
    const maxLeastQty = Math.max(...(leastProducts || []).map(p => p.totalQuantity), 1);
    const maxLeastRevenue = Math.max(...(leastProducts || []).map(p => p.totalRevenue), 1);
    const maxCatRevenue = Math.max(...(salesByCategory || []).map(c => c.totalRevenue), 1);

    // Sorted lists según criterio seleccionado
    const sortedTopProducts = [...(topProducts || [])].sort((a, b) =>
        sortBy === 'revenue' ? b.totalRevenue - a.totalRevenue : b.totalQuantity - a.totalQuantity
    );
    const sortedLeastProducts = [...(leastProducts || [])].sort((a, b) =>
        sortBy === 'revenue' ? a.totalRevenue - b.totalRevenue : a.totalQuantity - b.totalQuantity
    );

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

            {/* Sub-tabs */}
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
                            {tab.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>{tab.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Contenido según tab */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Más vendidos */}
                {activeTab === 'top' && (
                    <div className="divide-y divide-gray-50">
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 items-center">
                            <span className="col-span-1 text-xs font-semibold text-gray-500 uppercase">#</span>
                            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Producto</span>
                            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Categoría</span>
                            <span className={`col-span-1 text-right text-xs font-semibold uppercase ${sortBy === 'quantity' ? 'text-green-600' : 'text-gray-500'}`}>Unid.</span>
                            <span className="col-span-1 text-right text-xs font-semibold text-gray-500 uppercase">Pedidos</span>
                            <span className={`col-span-2 text-right text-xs font-semibold uppercase ${sortBy === 'revenue' ? 'text-green-600' : 'text-gray-500'}`}>Ingresos</span>
                            <div className="col-span-2 flex gap-1 justify-end">
                                <button onClick={() => setSortBy('revenue')}
                                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${sortBy === 'revenue' ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    Ingresos
                                </button>
                                <button onClick={() => setSortBy('quantity')}
                                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${sortBy === 'quantity' ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    Cant.
                                </button>
                            </div>
                        </div>
                        {sortedTopProducts.length > 0 ? sortedTopProducts.map((item, i) => {
                            const barValue = sortBy === 'revenue' ? item.totalRevenue : item.totalQuantity;
                            const barMax = sortBy === 'revenue' ? maxTopRevenue : maxTopQty;
                            return (
                                <div key={item._id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                                    <span className={`col-span-1 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                        i === 0 ? 'bg-amber-100 text-amber-700' :
                                        i === 1 ? 'bg-gray-200 text-gray-600' :
                                        i === 2 ? 'bg-orange-100 text-orange-600' :
                                        'text-gray-400'
                                    }`}>{i + 1}</span>
                                    <span className="col-span-3 text-sm font-medium text-gray-800 truncate">{item.product?.title || 'Eliminado'}</span>
                                    <span className="col-span-2 text-xs text-gray-500 truncate">{item.product?.category || '-'}</span>
                                    <span className={`col-span-1 text-sm font-semibold text-right ${sortBy === 'quantity' ? 'text-green-700' : 'text-gray-700'}`}>{item.totalQuantity}</span>
                                    <span className="col-span-1 text-xs text-gray-400 text-right">{item.orderCount}</span>
                                    <span className={`col-span-2 text-sm font-semibold text-right ${sortBy === 'revenue' ? 'text-green-700' : 'text-gray-600'}`}>{formatChileanCurrency(item.totalRevenue)}</span>
                                    <div className="col-span-2">
                                        <MiniBar value={barValue} max={barMax} color="bg-green-500" />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
                        )}
                    </div>
                )}

                {/* Menos vendidos */}
                {activeTab === 'least' && (
                    <div className="divide-y divide-gray-50">
                        <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 items-center">
                            <span className="col-span-1 text-xs font-semibold text-gray-500 uppercase">#</span>
                            <span className="col-span-3 text-xs font-semibold text-gray-500 uppercase">Producto</span>
                            <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Categoría</span>
                            <span className={`col-span-1 text-right text-xs font-semibold uppercase ${sortBy === 'quantity' ? 'text-red-500' : 'text-gray-500'}`}>Unid.</span>
                            <span className="col-span-1 text-right text-xs font-semibold text-gray-500 uppercase">Pedidos</span>
                            <span className={`col-span-2 text-right text-xs font-semibold uppercase ${sortBy === 'revenue' ? 'text-red-500' : 'text-gray-500'}`}>Ingresos</span>
                            <div className="col-span-2 flex gap-1 justify-end">
                                <button onClick={() => setSortBy('revenue')}
                                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${sortBy === 'revenue' ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    Ingresos
                                </button>
                                <button onClick={() => setSortBy('quantity')}
                                    className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${sortBy === 'quantity' ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                    Cant.
                                </button>
                            </div>
                        </div>
                        {sortedLeastProducts.length > 0 ? sortedLeastProducts.map((item, i) => {
                            const barValue = sortBy === 'revenue' ? item.totalRevenue : item.totalQuantity;
                            const barMax = sortBy === 'revenue' ? maxLeastRevenue : maxLeastQty;
                            return (
                                <div key={item._id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                                    <span className="col-span-1 text-xs text-gray-400">{i + 1}</span>
                                    <span className="col-span-3 text-sm font-medium text-gray-800 truncate">{item.product?.title || 'Eliminado'}</span>
                                    <span className="col-span-2 text-xs text-gray-500 truncate">{item.product?.category || '-'}</span>
                                    <span className={`col-span-1 text-sm font-semibold text-right ${sortBy === 'quantity' ? 'text-red-500' : 'text-gray-600'}`}>{item.totalQuantity}</span>
                                    <span className="col-span-1 text-xs text-gray-400 text-right">{item.orderCount}</span>
                                    <span className={`col-span-2 text-sm text-right ${sortBy === 'revenue' ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>{formatChileanCurrency(item.totalRevenue)}</span>
                                    <div className="col-span-2">
                                        <MiniBar value={barValue} max={barMax} color="bg-red-400" />
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
                        )}
                    </div>
                )}

                {/* Por categoría */}
                {activeTab === 'category' && (
                    <div className="p-5 space-y-4">
                        {salesByCategory && salesByCategory.length > 0 ? salesByCategory.map((cat, i) => {
                            const catColors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-red-400', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];
                            return (
                                <div key={cat._id || i}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700">{cat.categoryName || 'Sin categoría'}</span>
                                        <div className="flex gap-4">
                                            <span className="text-gray-500">{cat.totalQuantity} unid.</span>
                                            <span className="font-semibold text-gray-700">{formatChileanCurrency(cat.totalRevenue)}</span>
                                        </div>
                                    </div>
                                    <MiniBar value={cat.totalRevenue} max={maxCatRevenue} color={catColors[i % catColors.length]} />
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
                        )}
                    </div>
                )}

                {/* Nunca vendidos */}
                {activeTab === 'never' && (
                    <div>
                        {neverSold && neverSold.length > 0 ? (
                            <>
                                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                                    <p className="text-xs text-amber-700">
                                        <ExclamationTriangleIcon className="w-4 h-4 inline mr-1 -mt-0.5" />
                                        {neverSold.length} producto{neverSold.length !== 1 ? 's' : ''} activo{neverSold.length !== 1 ? 's' : ''} sin ventas en el período seleccionado.
                                        Considera revisar precios, visibilidad o desactivarlos.
                                    </p>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {neverSold.map(item => (
                                        <div key={item._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-medium text-gray-800 flex-1 truncate">{item.title}</span>
                                            <span className="text-xs text-gray-500">{item.category?.title || '-'}</span>
                                            <span className="text-sm text-gray-600">{formatChileanCurrency(item.price)}</span>
                                            {item.code && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{item.code}</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-green-600 font-medium">Todos los productos activos se vendieron en este período</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReporteProductos;
