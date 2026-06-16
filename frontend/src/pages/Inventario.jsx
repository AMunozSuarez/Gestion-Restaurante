import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInventory } from '../hooks/useInventory';
import inventoryService from '../services/inventoryService';
import { productsService } from '../services/productsService';
import extraSectionsService from '../services/extraSectionsService';
import InventoryItemFormModal from '../components/common/InventoryItemFormModal';
import StockAdjustModal from '../components/common/StockAdjustModal';
import RecipeModal from '../components/common/RecipeModal';

const UNIT_LABELS = {
    unidad: 'ud.',
    gramos: 'g',
    kilogramos: 'kg',
    litros: 'L',
    mililitros: 'mL',
    porciones: 'poc.',
};

const MOVEMENT_LABELS = {
    entrada_compra: 'Entrada',
    salida_venta: 'Venta',
    ajuste_positivo: 'Ajuste +',
    ajuste_negativo: 'Merma',
};

const MOVEMENT_COLORS = {
    entrada_compra: 'bg-green-100 text-green-800',
    salida_venta: 'bg-orange-100 text-orange-800',
    ajuste_positivo: 'bg-blue-100 text-blue-800',
    ajuste_negativo: 'bg-red-100 text-red-800',
};

const TAB_ITEMS = 'items';
const TAB_RECIPES = 'recipes';
const TAB_MOVEMENTS = 'movements';

const ITEMS_PER_PAGE = 20;

const Inventario = () => {
    const [tab, setTab] = useState(TAB_ITEMS);
    const [showInactive, setShowInactive] = useState(false);

    // Insumos state
    const {
        items, movements, movementsPagination, loading, error,
        lowStockCount, fetchItems, fetchMovements,
        createItem, updateItem, deleteItem, adjustStock,
    } = useInventory();

    // Modal state
    const [itemModal, setItemModal] = useState({ open: false, item: null });
    const [adjustModal, setAdjustModal] = useState({ open: false, item: null });
    const [recipeModal, setRecipeModal] = useState({ open: false, context: null });

    // Insumos filters
    const [itemSearch, setItemSearch] = useState('');
    const [itemSort, setItemSort] = useState('name_asc');
    const [itemLowStockOnly, setItemLowStockOnly] = useState(false);
    const [itemPage, setItemPage] = useState(1);

    // Recipes tab state
    const [products, setProducts] = useState([]);
    const [extraSections, setExtraSections] = useState([]);
    const [recipesLoading, setRecipesLoading] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState(new Set());
    const [recipeNoRecipeOnly, setRecipeNoRecipeOnly] = useState(false);

    // Movements filters
    const [mvPage, setMvPage] = useState(1);
    const [mvType, setMvType] = useState('');
    const [mvItem, setMvItem] = useState('');
    const [mvFrom, setMvFrom] = useState('');
    const [mvTo, setMvTo] = useState('');
    const [mvLimit, setMvLimit] = useState(25);

    // ── Load items on mount and when showInactive changes ──
    useEffect(() => {
        fetchItems(showInactive);
    }, [fetchItems, showInactive]);

    // ── Reset item page when filters change ──
    useEffect(() => { setItemPage(1); }, [itemSearch, itemSort, itemLowStockOnly, showInactive]);

    // ── Load movements when tab or filters change ──
    useEffect(() => {
        if (tab === TAB_MOVEMENTS) {
            fetchMovements({
                page: mvPage,
                limit: mvLimit,
                type: mvType || undefined,
                itemId: mvItem || undefined,
                from: mvFrom || undefined,
                to: mvTo || undefined,
            });
        }
    }, [tab, mvPage, mvLimit, mvType, mvItem, mvFrom, mvTo, fetchMovements]);

    // ── Load products and extras for recipe tab ──
    useEffect(() => {
        if (tab !== TAB_RECIPES) return;
        const load = async () => {
            setRecipesLoading(true);
            try {
                const [prodData, extData] = await Promise.all([
                    productsService.getProducts(),
                    extraSectionsService.getAll(),
                ]);
                setProducts(prodData.foods || []);
                setExtraSections(extData.sections || []);
            } catch (e) {
                console.error('Error cargando productos/extras para recetas:', e);
            } finally {
                setRecipesLoading(false);
            }
        };
        load();
    }, [tab]);

    const handleCreateItem = useCallback(async (data) => {
        await createItem(data);
    }, [createItem]);

    const handleUpdateItem = useCallback(async (data) => {
        await updateItem(itemModal.item._id, data);
    }, [updateItem, itemModal.item]);

    const handleAdjust = useCallback(async (data) => {
        await adjustStock(adjustModal.item._id, data);
        if (tab === TAB_MOVEMENTS) {
            fetchMovements({
                page: mvPage, limit: mvLimit,
                type: mvType || undefined, itemId: mvItem || undefined,
                from: mvFrom || undefined, to: mvTo || undefined,
            });
        }
    }, [adjustStock, adjustModal.item, tab, fetchMovements, mvPage, mvLimit, mvType, mvItem, mvFrom, mvTo]);

    const handleDeleteItem = async (item) => {
        if (!window.confirm(`¿Desactivar el insumo "${item.name}"?\n\nEl historial de movimientos se conservará.`)) return;
        try {
            await deleteItem(item._id);
        } catch (e) {
            alert(e.response?.data?.message || 'Error al desactivar el insumo');
        }
    };

    const handleReactivateItem = async (item) => {
        try {
            await updateItem(item._id, { isActive: true });
        } catch (e) {
            alert(e.response?.data?.message || 'Error al reactivar el insumo');
        }
    };

    const toggleCategory = (categoryName) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(categoryName) ? next.delete(categoryName) : next.add(categoryName);
            return next;
        });
    };

    const openRecipeForFood = (food) => {
        setRecipeModal({
            open: true,
            context: { type: 'food', id: food._id, title: food.title },
        });
    };

    const openRecipeForExtra = (section, extra) => {
        setRecipeModal({
            open: true,
            context: {
                type: 'extra',
                id: extra._id,
                sectionId: section._id,
                title: `${section.sectionName} → ${extra.name}`,
            },
        });
    };

    // ── Insumos: filter + sort + paginate (client-side) ──
    const filteredItems = useMemo(() => {
        let result = items;
        if (itemSearch) result = result.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
        if (itemLowStockOnly) result = result.filter(i => i.lowStock && i.isActive);
        result = [...result].sort((a, b) => {
            if (itemSort === 'name_desc') return b.name.localeCompare(a.name, 'es');
            if (itemSort === 'stock_asc') return a.currentStock - b.currentStock;
            if (itemSort === 'stock_desc') return b.currentStock - a.currentStock;
            if (itemSort === 'low_stock_first') {
                const diff = (b.lowStock ? 1 : 0) - (a.lowStock ? 1 : 0);
                return diff !== 0 ? diff : a.name.localeCompare(b.name, 'es');
            }
            return a.name.localeCompare(b.name, 'es'); // name_asc
        });
        return result;
    }, [items, itemSearch, itemSort, itemLowStockOnly]);

    const itemTotalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const paginatedItems = filteredItems.slice((itemPage - 1) * ITEMS_PER_PAGE, itemPage * ITEMS_PER_PAGE);

    const productsByCategory = useMemo(() => {
        const search = recipeSearch.toLowerCase();
        let filtered = products.filter(p => p.title?.toLowerCase().includes(search));
        if (recipeNoRecipeOnly) filtered = filtered.filter(p => !p.recipe || p.recipe.length === 0);
        const map = new Map();
        filtered.forEach(p => {
            const cat = p.category?.title || 'Sin categoría';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat).push(p);
        });
        return map;
    }, [products, recipeSearch, recipeNoRecipeOnly]);

    const filteredSections = extraSections.map(s => ({
        ...s,
        extras: s.extras?.filter(e =>
            e.name?.toLowerCase().includes(recipeSearch.toLowerCase())
        ) || [],
    })).filter(s => s.extras.length > 0 || s.sectionName?.toLowerCase().includes(recipeSearch.toLowerCase()));

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="h-full bg-gray-50 flex justify-center items-start overflow-auto">
            <div className="w-full max-w-5xl px-4 sm:px-6 py-6 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                        {lowStockCount > 0 && (
                            <p className="text-sm text-amber-600 font-medium mt-0.5">
                                ⚠ {lowStockCount} insumo{lowStockCount > 1 ? 's' : ''} con stock bajo
                            </p>
                        )}
                    </div>
                    {tab === TAB_ITEMS && (
                        <button
                            onClick={() => setItemModal({ open: true, item: null })}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo insumo
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    {[
                        { id: TAB_ITEMS, label: 'Insumos' },
                        { id: TAB_RECIPES, label: 'Recetas' },
                        { id: TAB_MOVEMENTS, label: 'Movimientos' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                tab === t.id
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* ── TAB: INSUMOS ── */}
                {tab === TAB_ITEMS && (
                    <div>
                        {/* Filtros */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Buscar insumo..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <select
                                value={itemSort}
                                onChange={e => setItemSort(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="name_asc">Nombre A-Z</option>
                                <option value="name_desc">Nombre Z-A</option>
                                <option value="stock_asc">Stock ↑</option>
                                <option value="stock_desc">Stock ↓</option>
                                <option value="low_stock_first">Stock bajo primero</option>
                            </select>
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
                                <input
                                    type="checkbox"
                                    checked={itemLowStockOnly}
                                    onChange={e => setItemLowStockOnly(e.target.checked)}
                                    className="rounded"
                                />
                                Solo stock bajo
                            </label>
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
                                <input
                                    type="checkbox"
                                    checked={showInactive}
                                    onChange={e => setShowInactive(e.target.checked)}
                                    className="rounded"
                                />
                                Mostrar inactivos
                            </label>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">
                                {filteredItems.length} insumo{filteredItems.length !== 1 ? 's' : ''}
                                {filteredItems.length !== items.length && ` (de ${items.length})`}
                            </p>
                            {itemTotalPages > 1 && (
                                <p className="text-xs text-gray-400">Página {itemPage} de {itemTotalPages}</p>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                </svg>
                                {items.length === 0
                                    ? <><p className="text-sm">No hay insumos creados</p><p className="text-xs mt-1">Crea el primer insumo con el botón de arriba</p></>
                                    : <p className="text-sm">No hay insumos que coincidan con los filtros</p>
                                }
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-gray-600">Insumo</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600">Stock actual</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Stock mín.</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Estado</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedItems.map(item => (
                                            <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {item.lowStock && item.isActive && (
                                                            <span title="Stock bajo" className="text-amber-500 flex-shrink-0">⚠</span>
                                                        )}
                                                        <span className="font-medium text-gray-900">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-semibold ${item.lowStock && item.isActive ? 'text-amber-600' : 'text-gray-900'}`}>
                                                        {item.currentStock}
                                                    </span>
                                                    <span className="text-gray-400 ml-1">{UNIT_LABELS[item.unit] || item.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                                                    {item.minStock != null
                                                        ? `${item.minStock} ${UNIT_LABELS[item.unit] || item.unit}`
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {item.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {item.isActive ? (
                                                            <>
                                                                <button
                                                                    onClick={() => setAdjustModal({ open: true, item })}
                                                                    className="px-2 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                                                    title="Ajustar stock"
                                                                >
                                                                    Ajustar
                                                                </button>
                                                                <button
                                                                    onClick={() => setItemModal({ open: true, item })}
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteItem(item)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Desactivar"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleReactivateItem(item)}
                                                                className="px-2 py-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                                                title="Reactivar insumo"
                                                            >
                                                                Reactivar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Paginación insumos */}
                        {itemTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button
                                    onClick={() => setItemPage(p => Math.max(1, p - 1))}
                                    disabled={itemPage === 1}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="text-sm text-gray-500">
                                    {itemPage} / {itemTotalPages}
                                </span>
                                <button
                                    onClick={() => setItemPage(p => Math.min(itemTotalPages, p + 1))}
                                    disabled={itemPage === itemTotalPages}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: RECETAS ── */}
                {tab === TAB_RECIPES && (
                    <div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Buscar producto o extra..."
                                value={recipeSearch}
                                onChange={e => setRecipeSearch(e.target.value)}
                                className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
                                <input
                                    type="checkbox"
                                    checked={recipeNoRecipeOnly}
                                    onChange={e => setRecipeNoRecipeOnly(e.target.checked)}
                                    className="rounded"
                                />
                                Sin receta asignada
                            </label>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                            Haz clic en "Ver receta" para asociar insumos a cada producto o extra.
                            El inventario se descontará automáticamente al completar una venta.
                        </p>

                        {recipesLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Productos agrupados por categoría */}
                                {productsByCategory.size > 0 && (
                                    <>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Productos</p>
                                        {[...productsByCategory.entries()].map(([categoryName, categoryProducts]) => {
                                            const isCollapsed = collapsedCategories.has(categoryName);
                                            return (
                                                <div key={categoryName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                    {/* Cabecera de categoría colapsable */}
                                                    <button
                                                        onClick={() => toggleCategory(categoryName)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                                    >
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {categoryName}
                                                            <span className="ml-2 text-xs font-normal text-gray-400">
                                                                ({categoryProducts.length})
                                                            </span>
                                                        </span>
                                                        <svg
                                                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {/* Filas de productos */}
                                                    {!isCollapsed && (
                                                        <table className="w-full text-sm">
                                                            <tbody className="divide-y divide-gray-100">
                                                                {categoryProducts.map(product => (
                                                                    <tr key={product._id} className="hover:bg-gray-50">
                                                                        <td className="px-4 py-3 font-medium text-gray-900">
                                                                            {product.title}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <button
                                                                                onClick={() => openRecipeForFood(product)}
                                                                                className="px-3 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                                                            >
                                                                                Ver receta
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}

                                {/* Extras */}
                                {filteredSections.length > 0 && (
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">Extras</p>
                                )}
                                {filteredSections.map(section => {
                                    const sectionKey = `extras-${section._id}`;
                                    const isCollapsed = collapsedCategories.has(sectionKey);
                                    return (
                                        <div key={section._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <button
                                                onClick={() => toggleCategory(sectionKey)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                            >
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {section.sectionName}
                                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                                        ({section.extras.length})
                                                    </span>
                                                </span>
                                                <svg
                                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {!isCollapsed && (
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-gray-100">
                                                        {section.extras.map(extra => (
                                                            <tr key={extra._id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {extra.name}
                                                                    {extra.price > 0 && (
                                                                        <span className="text-gray-400 font-normal ml-2">
                                                                            +${extra.price?.toLocaleString('es-CL')}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => openRecipeForExtra(section, extra)}
                                                                        className="px-3 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                                                    >
                                                                        Ver receta
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}

                                {productsByCategory.size === 0 && filteredSections.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <p className="text-sm">No se encontraron resultados</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: MOVIMIENTOS ── */}
                {tab === TAB_MOVEMENTS && (
                    <div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {/* Tipo */}
                            <select
                                value={mvType}
                                onChange={e => { setMvType(e.target.value); setMvPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">Todos los tipos</option>
                                <option value="entrada_compra">Entrada por compra</option>
                                <option value="salida_venta">Salida por venta</option>
                                <option value="ajuste_positivo">Ajuste positivo</option>
                                <option value="ajuste_negativo">Ajuste negativo / Merma</option>
                            </select>
                            {/* Insumo */}
                            <select
                                value={mvItem}
                                onChange={e => { setMvItem(e.target.value); setMvPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">Todos los insumos</option>
                                {[...items].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(i => (
                                    <option key={i._id} value={i._id}>{i.name}</option>
                                ))}
                            </select>
                            {/* Fecha desde */}
                            <input
                                type="date"
                                value={mvFrom}
                                onChange={e => { setMvFrom(e.target.value); setMvPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                title="Desde"
                            />
                            {/* Fecha hasta */}
                            <input
                                type="date"
                                value={mvTo}
                                onChange={e => { setMvTo(e.target.value); setMvPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                title="Hasta"
                            />
                            {/* Resultados por página */}
                            <select
                                value={mvLimit}
                                onChange={e => { setMvLimit(Number(e.target.value)); setMvPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value={25}>25 por página</option>
                                <option value={50}>50 por página</option>
                                <option value={100}>100 por página</option>
                            </select>
                            {/* Limpiar filtros */}
                            {(mvType || mvItem || mvFrom || mvTo) && (
                                <button
                                    onClick={() => { setMvType(''); setMvItem(''); setMvFrom(''); setMvTo(''); setMvPage(1); }}
                                    className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                            {movementsPagination && (
                                <span className="ml-auto self-center text-sm text-gray-500">
                                    {movementsPagination.total} movimiento{movementsPagination.total !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <p className="text-sm">No hay movimientos registrados</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                                                <th className="text-left px-4 py-3 font-medium text-gray-600">Insumo</th>
                                                <th className="text-center px-4 py-3 font-medium text-gray-600">Tipo</th>
                                                <th className="text-right px-4 py-3 font-medium text-gray-600">Cantidad</th>
                                                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Referencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {movements.map(mv => (
                                                <tr key={mv._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                        {formatDate(mv.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">
                                                        {mv.item?.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MOVEMENT_COLORS[mv.type] || 'bg-gray-100 text-gray-600'}`}>
                                                            {MOVEMENT_LABELS[mv.type] || mv.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold">
                                                        <span className={
                                                            mv.type === 'salida_venta' || mv.type === 'ajuste_negativo'
                                                                ? 'text-red-600'
                                                                : 'text-green-600'
                                                        }>
                                                            {mv.type === 'salida_venta' || mv.type === 'ajuste_negativo' ? '-' : '+'}
                                                            {mv.quantity}
                                                        </span>
                                                        <span className="text-gray-400 ml-1 text-xs">
                                                            {UNIT_LABELS[mv.item?.unit] || mv.item?.unit || ''}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                                                        {mv.reference || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                {movementsPagination && movementsPagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <button
                                            onClick={() => setMvPage(p => Math.max(1, p - 1))}
                                            disabled={mvPage === 1}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                        >
                                            Anterior
                                        </button>
                                        <span className="text-sm text-gray-500">
                                            Página {mvPage} de {movementsPagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setMvPage(p => Math.min(movementsPagination.totalPages, p + 1))}
                                            disabled={mvPage === movementsPagination.totalPages}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modales */}
            <InventoryItemFormModal
                isOpen={itemModal.open}
                item={itemModal.item}
                onClose={() => setItemModal({ open: false, item: null })}
                onSave={itemModal.item ? handleUpdateItem : handleCreateItem}
            />

            <StockAdjustModal
                isOpen={adjustModal.open}
                item={adjustModal.item}
                onClose={() => setAdjustModal({ open: false, item: null })}
                onSave={handleAdjust}
            />

            <RecipeModal
                isOpen={recipeModal.open}
                context={recipeModal.context}
                onClose={() => setRecipeModal({ open: false, context: null })}
            />
        </div>
    );
};

export default Inventario;
