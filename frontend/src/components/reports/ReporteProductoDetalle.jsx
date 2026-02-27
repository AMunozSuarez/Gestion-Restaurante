import React, { useState, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    CubeIcon,
    CurrencyDollarIcon,
    ShoppingCartIcon,
    CalculatorIcon,
    ChartBarIcon,
    ArrowPathIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
import { useReportProductDetail, useAllFoods } from '../../hooks/useReports';
import { getChileToday, getChileDateWithOffset, formatChileanCurrency } from '../../utils/dateUtils';

// ─── Mini bar para el gráfico de días ─────────────────────────────────────────
const DayBar = ({ label, qty, revenue, maxQty, formatCurrency, onHover, onLeave }) => {
    const pct = maxQty > 0 ? Math.round((qty / maxQty) * 100) : 0;
    return (
        <div
            className="flex flex-col items-center flex-shrink-0 gap-1 cursor-default"
            style={{ width: '44px' }}
            onMouseEnter={e => onHover(e, { label, qty, revenue })}
            onMouseLeave={onLeave}
        >
            <div className="relative w-full bg-gray-100 rounded-t-md" style={{ height: '100px' }}>
                <div
                    className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t-md transition-all duration-500"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                />
            </div>
            <span className="text-[9px] text-gray-400 w-full text-center truncate">{label.slice(5)}</span>
        </div>
    );
};

// ─── Tarjeta de resumen ────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'green' }) => {
    const colorMap = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colorMap[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

// ─── Componente principal ──────────────────────────────────────────────────────

const ReporteProductoDetalle = () => {
    const today = getChileToday();
    const monthAgo = getChileDateWithOffset(-30);

    const [search, setSearch] = useState('');
    const [selectedFood, setSelectedFood] = useState(null);
    const [startDate, setStartDate] = useState(monthAgo);
    const [endDate, setEndDate] = useState(today);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [tooltip, setTooltip] = useState(null); // { x, y, label, qty, revenue }

    const { foods, isLoading: isFoodsLoading } = useAllFoods();
    const { data, isLoading, error, fetch } = useReportProductDetail();

    // Filtrar sugerencias
    const suggestions = useMemo(() => {
        if (!search.trim() || search.length < 2) return [];
        const lower = search.toLowerCase();
        return foods
            .filter(f => f.title?.toLowerCase().includes(lower) || f.code?.toLowerCase().includes(lower))
            .slice(0, 10);
    }, [search, foods]);

    const handleSelectFood = (food) => {
        setSelectedFood(food);
        setSearch(food.title);
        setShowSuggestions(false);
    };

    const handleSearch = () => {
        if (!selectedFood) return;
        fetch({ foodId: selectedFood._id, startDate, endDate });
    };

    const handleQuickRange = (days) => {
        setStartDate(getChileDateWithOffset(-days));
        setEndDate(today);
    };

    // Datos formateados
    const summary = data?.summary;
    const salesByDay = data?.salesByDay || [];
    const salesBySection = data?.salesBySection || [];
    const product = data?.product;

    const maxQty = Math.max(...salesByDay.map(d => d.quantity), 1);

    const handleBarHover = (e, data) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top,
            ...data,
        });
    };

    const handleBarLeave = () => setTooltip(null);

    const SECTION_LABELS = {
        mostrador: 'Mostrador',
        delivery: 'Delivery',
        mesa: 'Mesa',
    };

    return (
        <div className="space-y-6">
            {/* ── Buscador de producto ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MagnifyingGlassIcon className="w-4 h-4 text-green-600" />
                    Buscar producto
                </h2>

                <div className="flex flex-wrap items-end gap-4">
                    {/* Input de búsqueda */}
                    <div className="relative flex-1 min-w-[220px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Nombre o código del producto
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setSelectedFood(null);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                placeholder={isFoodsLoading ? 'Cargando productos...' : 'Ej: Hamburguesa clásica'}
                                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                        </div>

                        {/* Dropdown de sugerencias */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
                                {suggestions.map(food => (
                                    <button
                                        key={food._id}
                                        onMouseDown={() => handleSelectFood(food)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 transition-colors text-left"
                                    >
                                        <CubeIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-700 truncate">{food.title}</p>
                                            <p className="text-xs text-gray-400">
                                                {food.category?.title || 'Sin categoría'} · {formatChileanCurrency(food.price)}
                                                {food.code ? ` · Cód: ${food.code}` : ''}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {showSuggestions && search.length >= 2 && suggestions.length === 0 && !isFoodsLoading && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-500 z-20">
                                No se encontraron productos con "{search}"
                            </div>
                        )}
                    </div>

                    {/* Fechas */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Atajos de fecha */}
                    <div className="flex gap-2">
                        {[
                            { label: '7 días', days: 7 },
                            { label: '30 días', days: 30 },
                            { label: '90 días', days: 90 },
                        ].map(r => (
                            <button
                                key={r.label}
                                onClick={() => handleQuickRange(r.days)}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Botón consultar */}
                    <button
                        onClick={handleSearch}
                        disabled={!selectedFood || isLoading}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <ChartBarIcon className="w-4 h-4" />
                        )}
                        {isLoading ? 'Consultando...' : 'Ver reporte'}
                    </button>
                </div>

                {/* Producto seleccionado */}
                {selectedFood && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 w-fit">
                        <TagIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">{selectedFood.title}</span>
                        {selectedFood.category?.title && (
                            <span className="text-green-500">· {selectedFood.category.title}</span>
                        )}
                        <span className="text-green-500">· {formatChileanCurrency(selectedFood.price)}</span>
                    </div>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="text-center text-red-500 py-8 text-sm">{error}</div>
            )}

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
                </div>
            )}

            {/* ── Resultados ── */}
            {!isLoading && data && (
                <>
                    {/* Encabezado con el nombre del producto */}
                    <div className="flex items-center gap-2">
                        <CubeIcon className="w-5 h-5 text-green-600" />
                        <h2 className="text-base font-bold text-gray-800">
                            {product?.title || selectedFood?.title}
                        </h2>
                        {product?.category?.title && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {product.category.title}
                            </span>
                        )}
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            {startDate} → {endDate}
                        </span>
                    </div>

                    {/* Tarjetas de resumen */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={CubeIcon}
                            label="Unidades vendidas"
                            value={summary?.totalQuantity?.toLocaleString('es-CL') ?? '0'}
                            sub="en el período"
                            color="green"
                        />
                        <StatCard
                            icon={CurrencyDollarIcon}
                            label="Ingresos generados"
                            value={formatChileanCurrency(summary?.totalRevenue ?? 0)}
                            sub="total acumulado"
                            color="blue"
                        />
                        <StatCard
                            icon={ShoppingCartIcon}
                            label="Órdenes que lo incluyen"
                            value={summary?.orderCount?.toLocaleString('es-CL') ?? '0'}
                            sub="pedidos distintos"
                            color="purple"
                        />
                        <StatCard
                            icon={CalculatorIcon}
                            label="Promedio por orden"
                            value={`${summary?.avgPerOrder ?? 0} unid.`}
                            sub="cantidad media"
                            color="amber"
                        />
                    </div>

                    {/* Tooltip flotante fuera del overflow */}
                    {tooltip && (
                        <div
                            className="fixed z-50 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none flex flex-col gap-0.5"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y - 8,
                                transform: 'translate(-50%, -100%)',
                            }}
                        >
                            <span className="font-semibold border-b border-gray-600 pb-1 mb-0.5">{tooltip.label}</span>
                            <span>{tooltip.qty} unidad{tooltip.qty !== 1 ? 'es' : ''}</span>
                            <span className="text-green-400">{formatChileanCurrency(tooltip.revenue)}</span>
                        </div>
                    )}

                    {/* Gráfico por día */}
                    {salesByDay.length > 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-green-600" />
                                Ventas por día (unidades)
                            </h3>
                            <div className="flex items-end gap-2 overflow-x-auto pb-2 pt-2" style={{ minHeight: '130px' }}>
                                {salesByDay.map(d => (
                                    <DayBar
                                        key={d._id}
                                        label={d._id}
                                        qty={d.quantity}
                                        revenue={d.revenue}
                                        maxQty={maxQty}
                                        formatCurrency={formatChileanCurrency}
                                        onHover={handleBarHover}
                                        onLeave={handleBarLeave}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 text-sm">
                            No hay ventas registradas en el período seleccionado.
                        </div>
                    )}

                    {/* Ventas por sección */}
                    {salesBySection.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <TagIcon className="w-4 h-4 text-green-600" />
                                Desglose por sección
                            </h3>
                            <div className="space-y-3">
                                {salesBySection.map(s => {
                                    const total = salesBySection.reduce((acc, x) => acc + x.quantity, 0) || 1;
                                    const pct = Math.round((s.quantity / total) * 100);
                                    return (
                                        <div key={s._id} className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600 w-24 capitalize">
                                                {SECTION_LABELS[s._id] || s._id || 'Sin sección'}
                                            </span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                                                {s.quantity} unid.
                                            </span>
                                            <span className="text-sm text-gray-400 w-24 text-right">
                                                {formatChileanCurrency(s.revenue)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Estado vacío inicial */}
            {!isLoading && !data && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-6 bg-green-50 rounded-full mb-4">
                        <MagnifyingGlassIcon className="w-10 h-10 text-green-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Busca un producto para ver sus estadísticas de venta</p>
                    <p className="text-gray-400 text-sm mt-1">Selecciona un producto y un rango de fechas</p>
                </div>
            )}
        </div>
    );
};

export default ReporteProductoDetalle;
