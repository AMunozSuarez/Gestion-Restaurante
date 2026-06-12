import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';

const RecipeModal = ({ isOpen, onClose, context }) => {
    // context: { type: 'food'|'extra', id, sectionId?, title }
    const [recipe, setRecipe] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !context) return;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [recipeData, itemsData] = await Promise.all([
                    context.type === 'food'
                        ? inventoryService.getFoodRecipe(context.id)
                        : inventoryService.getExtraRecipe(context.sectionId, context.id),
                    inventoryService.getItems(),
                ]);
                setRecipe(
                    (recipeData.recipe || []).map(r => ({
                        ingredient: r.ingredient?._id || r.ingredient,
                        quantity: r.quantity,
                    }))
                );
                setItems(itemsData.items || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Error al cargar receta');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen, context]);

    const addLine = () => {
        setRecipe(prev => [...prev, { ingredient: '', quantity: '' }]);
    };

    const removeLine = (index) => {
        setRecipe(prev => prev.filter((_, i) => i !== index));
    };

    const updateLine = (index, field, value) => {
        setRecipe(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
    };

    const handleSave = async () => {
        setError('');

        const validLines = recipe.filter(r => r.ingredient && Number(r.quantity) > 0);
        const hasInvalid = recipe.some(r => !r.ingredient || !(Number(r.quantity) > 0));
        if (recipe.length > 0 && hasInvalid) {
            setError('Todas las líneas deben tener insumo y cantidad mayor a 0');
            return;
        }

        setSaving(true);
        try {
            const payload = validLines.map(r => ({
                ingredient: r.ingredient,
                quantity: Number(r.quantity),
            }));

            if (context.type === 'food') {
                await inventoryService.updateFoodRecipe(context.id, payload);
            } else {
                await inventoryService.updateExtraRecipe(context.sectionId, context.id, payload);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar receta');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const getUnitForIngredient = (ingredientId) => {
        const item = items.find(i => i._id === ingredientId);
        return item?.unit || '';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Receta</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{context?.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            {items.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">No hay insumos creados.</p>
                                    <p className="text-xs mt-1">Crea insumos en la pestaña de Insumos primero.</p>
                                </div>
                            ) : (
                                <>
                                    {recipe.length === 0 && (
                                        <p className="text-sm text-gray-500 mb-4">
                                            Sin receta. Este producto no descontará inventario al venderse.
                                        </p>
                                    )}

                                    <div className="space-y-3">
                                        {recipe.map((line, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <select
                                                    value={line.ingredient}
                                                    onChange={(e) => updateLine(index, 'ingredient', e.target.value)}
                                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                >
                                                    <option value="">Seleccionar insumo...</option>
                                                    {items.map(item => (
                                                        <option key={item._id} value={item._id}>
                                                            {item.name} ({item.unit})
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="flex items-center gap-1 w-36">
                                                    <input
                                                        type="number"
                                                        value={line.quantity}
                                                        onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                                        min="0.001"
                                                        step="0.001"
                                                        placeholder="Cant."
                                                        className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    />
                                                    <span className="text-xs text-gray-500 w-12 truncate">
                                                        {getUnitForIngredient(line.ingredient)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeLine(index)}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={addLine}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-sm hover:border-green-400 hover:text-green-600 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Agregar ingrediente
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading || items.length === 0}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Guardando...' : 'Guardar receta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipeModal;
