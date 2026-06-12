import React, { useState, useEffect } from 'react';

const UNITS = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'gramos', label: 'Gramos' },
    { value: 'kilogramos', label: 'Kilogramos' },
    { value: 'litros', label: 'Litros' },
    { value: 'mililitros', label: 'Mililitros' },
    { value: 'porciones', label: 'Porciones' },
];

const InventoryItemFormModal = ({ isOpen, onClose, onSave, item = null }) => {
    const isEditing = Boolean(item);
    const [form, setForm] = useState({ name: '', unit: 'unidad', currentStock: '', minStock: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (item) {
                setForm({
                    name: item.name || '',
                    unit: item.unit || 'unidad',
                    currentStock: item.currentStock ?? '',
                    minStock: item.minStock ?? '',
                });
            } else {
                setForm({ name: '', unit: 'unidad', currentStock: '', minStock: '' });
            }
            setError('');
        }
    }, [isOpen, item]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                name: form.name.trim(),
                unit: form.unit,
                currentStock: form.currentStock !== '' ? Number(form.currentStock) : 0,
                minStock: form.minStock !== '' ? Number(form.minStock) : null,
            });
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar el insumo');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Editar insumo' : 'Nuevo insumo'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ej: Harina, Tomate, Aceite..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unidad de medida <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="unit"
                            value={form.unit}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {UNITS.map(u => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    </div>

                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stock inicial
                            </label>
                            <input
                                type="number"
                                name="currentStock"
                                value={form.currentStock}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock mínimo <span className="text-gray-400 font-normal">(opcional — activa alertas)</span>
                        </label>
                        <input
                            type="number"
                            name="minStock"
                            value={form.minStock}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="Sin mínimo"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear insumo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryItemFormModal;
