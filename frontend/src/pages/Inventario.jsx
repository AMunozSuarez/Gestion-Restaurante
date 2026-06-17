import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useRestaurant } from '../hooks/useRestaurant';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
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
    const navigate = useNavigate();
    const { restaurant, isLoading: isRestaurantLoading, refetch: refetchRestaurant } = useRestaurant();
    const { user } = useAuth();
    const [activating, setActivating] = useState(false);
    const [activateError, setActivateError] = useState('');

    const inventoryEnabled = Boolean(restaurant?.settings?.inventory?.enabled);
    const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

    const handleActivateInventory = async () => {
        setActivating(true);
        setActivateError('');
        try {
            await api.put('/restaurant/settings/me', { inventoryEnabled: true });
            await refetchRestaurant();
        } catch {
            setActivateError('No se pudo activar el inventario. Intenta de nuevo.');
        } finally {
            setActivating(false);
        }
    };

    const [tab, setTab] = useState(TAB_ITEMS);
    const [showInactive, setShowInactive] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

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
    const [recipeDisabledOnly, setRecipeDisabledOnly] = useState(false);
    const [togglingRecipe, setTogglingRecipe] = useState(new Set()); // IDs en vuelo

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

    const handleToggleFoodRecipe = async (product) => {
        if (togglingRecipe.has(product._id)) return;
        setTogglingRecipe(prev => new Set(prev).add(product._id));
        try {
            const data = await inventoryService.toggleFoodRecipeEnabled(product._id);
            setProducts(prev => prev.map(p =>
                p._id === product._id ? { ...p, recipeEnabled: data.recipeEnabled } : p
            ));
        } catch {
            // silently ignore
        } finally {
            setTogglingRecipe(prev => { const s = new Set(prev); s.delete(product._id); return s; });
        }
    };

    const handleToggleExtraRecipe = async (section, extra) => {
        const key = `${section._id}-${extra._id}`;
        if (togglingRecipe.has(key)) return;
        setTogglingRecipe(prev => new Set(prev).add(key));
        try {
            const data = await inventoryService.toggleExtraRecipeEnabled(section._id, extra._id);
            setExtraSections(prev => prev.map(s => {
                if (s._id !== section._id) return s;
                return {
                    ...s,
                    extras: s.extras.map(e =>
                        e._id === extra._id ? { ...e, recipeEnabled: data.recipeEnabled } : e
                    ),
                };
            }));
        } catch {
            // silently ignore
        } finally {
            setTogglingRecipe(prev => { const s = new Set(prev); s.delete(key); return s; });
        }
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
        if (recipeDisabledOnly) filtered = filtered.filter(p => p.recipe?.length > 0 && p.recipeEnabled === false);
        const map = new Map();
        filtered.forEach(p => {
            const cat = p.category?.title || 'Sin categoría';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat).push(p);
        });
        return map;
    }, [products, recipeSearch, recipeNoRecipeOnly, recipeDisabledOnly]);

    const filteredSections = extraSections.map(s => ({
        ...s,
        extras: (s.extras || []).filter(e => {
            const matchSearch = e.name?.toLowerCase().includes(recipeSearch.toLowerCase());
            const matchNoRecipe = !recipeNoRecipeOnly || !e.recipe?.length;
            const matchDisabled = !recipeDisabledOnly || (e.recipe?.length > 0 && e.recipeEnabled === false);
            return matchSearch && matchNoRecipe && matchDisabled;
        }),
    })).filter(s => s.extras.length > 0);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // ── Pantalla cuando el inventario está desactivado ──
    if (!isRestaurantLoading && !inventoryEnabled) {
        return (
            <div className="h-full bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Control de inventario desactivado</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        El módulo de inventario no está habilitado para este restaurante.
                        {isOwner
                            ? ' Puedes activarlo ahora para comenzar a gestionar el stock de insumos y recetas.'
                            : ' Contacta al administrador del restaurante para activarlo.'}
                    </p>

                    {isOwner ? (
                        <div className="space-y-3">
                            <button
                                onClick={handleActivateInventory}
                                disabled={activating}
                                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                            >
                                {activating ? 'Activando...' : 'Activar control de inventario'}
                            </button>
                            <button
                                onClick={() => navigate('/configuracion?tab=inventory')}
                                className="w-full px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Ir a Configuración
                            </button>
                            {activateError && (
                                <p className="text-sm text-red-600">{activateError}</p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Volver
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 flex justify-center items-start overflow-auto">
            <div className="w-full max-w-5xl px-4 sm:px-6 py-6 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                            {lowStockCount > 0 && (
                                <p className="text-sm text-amber-600 font-medium mt-0.5">
                                    ⚠ {lowStockCount} insumo{lowStockCount > 1 ? 's' : ''} con stock bajo
                                </p>
                            )}
                        </div>
                        {/* Botón de ayuda */}
                        <div className="relative self-start mt-1">
                            <button
                                onClick={() => setHelpOpen(v => !v)}
                                className="w-6 h-6 rounded-full border border-gray-300 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-400 flex items-center justify-center text-xs font-bold transition-colors"
                                title="¿Cómo funciona el inventario?"
                            >
                                ?
                            </button>
                            {helpOpen && (
                                <div className="absolute left-0 top-8 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-sm text-gray-600 space-y-3">
                                    <button
                                        onClick={() => setHelpOpen(false)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                    <p className="font-semibold text-gray-800 pr-4">¿Cómo funciona el inventario?</p>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className="text-green-600 font-bold flex-shrink-0">1.</span>
                                            <p><span className="font-medium text-gray-700">Insumos</span> — crea los ingredientes o materiales que usas (harina, queso, vasos, etc.) con su unidad de medida y stock actual.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-green-600 font-bold flex-shrink-0">2.</span>
                                            <p><span className="font-medium text-gray-700">Recetas</span> — asigna a cada producto y extra qué insumos consume y en qué cantidad al venderse.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-green-600 font-bold flex-shrink-0">3.</span>
                                            <p><span className="font-medium text-gray-700">Descuento automático</span> — al completar una venta o cerrar una mesa, el stock se descuenta solo según las recetas configuradas.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-green-600 font-bold flex-shrink-0">4.</span>
                                            <p><span className="font-medium text-gray-700">Movimientos</span> — cada entrada, venta o ajuste queda registrado con fecha y referencia para trazabilidad.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-amber-500 font-bold flex-shrink-0">⚠</span>
                                            <p>El aviso de <span className="font-medium text-gray-700">stock bajo</span> aparece cuando el stock actual es igual o menor al stock mínimo configurado.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                                            <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Costo unit.</th>
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
                                                <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                                                    {item.unitCost != null
                                                        ? `$${item.unitCost.toLocaleString('es-CL')}`
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
                                    onChange={e => { setRecipeNoRecipeOnly(e.target.checked); if (e.target.checked) setRecipeDisabledOnly(false); }}
                                    className="rounded"
                                />
                                Sin receta asignada
                            </label>
                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50 select-none">
                                <input
                                    type="checkbox"
                                    checked={recipeDisabledOnly}
                                    onChange={e => { setRecipeDisabledOnly(e.target.checked); if (e.target.checked) setRecipeNoRecipeOnly(false); }}
                                    className="rounded"
                                />
                                Recetas desactivadas
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
                                                                        <td className="px-4 py-3">
                                                                            <span className="font-medium text-gray-900">{product.title}</span>
                                                                            {product.recipe?.length > 0 && product.recipeEnabled === false && (
                                                                                <span className="ml-2 text-xs text-gray-400 italic">pausada</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="inline-flex items-center gap-1.5">
                                                                                {product.recipe?.length > 0 && (
                                                                                    <button
                                                                                        onClick={() => handleToggleFoodRecipe(product)}
                                                                                        disabled={togglingRecipe.has(product._id)}
                                                                                        title={product.recipeEnabled === false ? 'Activar descuento de stock' : 'Desactivar descuento de stock'}
                                                                                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                                                                                            product.recipeEnabled === false
                                                                                                ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                                                                                : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                                                        }`}
                                                                                    >
                                                                                        {product.recipeEnabled === false ? 'Activar' : 'Desactivar'}
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => openRecipeForFood(product)}
                                                                                    className="px-3 py-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                                                                >
                                                                                    Ver receta
                                                                                </button>
                                                                            </div>
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
                                                                <td className="px-4 py-3">
                                                                    <span className="font-medium text-gray-900">{extra.name}</span>
                                                                    {extra.price > 0 && (
                                                                        <span className="text-gray-400 font-normal ml-2">
                                                                            +${extra.price?.toLocaleString('es-CL')}
                                                                        </span>
                                                                    )}
                                                                    {extra.recipe?.length > 0 && extra.recipeEnabled === false && (
                                                                        <span className="ml-2 text-xs text-gray-400 italic">pausada</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="inline-flex items-center gap-1.5">
                                                                        {extra.recipe?.length > 0 && (
                                                                            <button
                                                                                onClick={() => handleToggleExtraRecipe(section, extra)}
                                                                                disabled={togglingRecipe.has(`${section._id}-${extra._id}`)}
                                                                                title={extra.recipeEnabled === false ? 'Activar descuento de stock' : 'Desactivar descuento de stock'}
                                                                                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                                                                                    extra.recipeEnabled === false
                                                                                        ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                                                                        : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                                                }`}
                                                                            >
                                                                                {extra.recipeEnabled === false ? 'Activar' : 'Desactivar'}
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => openRecipeForExtra(section, extra)}
                                                                            className="px-3 py-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                                                        >
                                                                            Ver receta
                                                                        </button>
                                                                    </div>
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
                                                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Costo total</th>
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
                                                    <td className="px-4 py-3 text-right hidden md:table-cell">
                                                        {mv.item?.unitCost != null
                                                            ? <span className="text-gray-700 font-medium">${(mv.quantity * mv.item.unitCost).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                                                            : <span className="text-gray-300">—</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                                                        {mv.reference || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Resumen de costos de la página actual */}
                                {(() => {
                                    const withCost = movements.filter(mv => mv.item?.unitCost != null);
                                    if (withCost.length === 0) return null;
                                    const totalEntradas = withCost
                                        .filter(mv => mv.type === 'entrada_compra' || mv.type === 'ajuste_positivo')
                                        .reduce((acc, mv) => acc + mv.quantity * mv.item.unitCost, 0);
                                    const totalSalidas = withCost
                                        .filter(mv => mv.type === 'salida_venta' || mv.type === 'ajuste_negativo')
                                        .reduce((acc, mv) => acc + mv.quantity * mv.item.unitCost, 0);
                                    return (
                                        <div className="mt-3 flex flex-wrap gap-3 justify-end">
                                            {totalEntradas > 0 && (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                                                    <span className="text-green-700 font-medium">Entradas/ajustes+</span>
                                                    <span className="text-green-800 font-bold">${totalEntradas.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                                                </div>
                                            )}
                                            {totalSalidas > 0 && (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                                                    <span className="text-red-700 font-medium">Salidas/mermas</span>
                                                    <span className="text-red-800 font-bold">${totalSalidas.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm">
                                                <span className="text-gray-600 font-medium">Neto</span>
                                                <span className={`font-bold ${totalEntradas - totalSalidas >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    ${(totalEntradas - totalSalidas).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

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
