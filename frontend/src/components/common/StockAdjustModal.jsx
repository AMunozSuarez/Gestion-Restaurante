import React, { useState, useEffect } from 'react';

const ADJUSTMENT_TYPES = [
    { value: 'entrada_compra', label: 'Entrada por compra', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    { value: 'ajuste_positivo', label: 'Ajuste positivo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { value: 'ajuste_negativo', label: 'Ajuste negativo / Merma', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
];

const StockAdjustModal = ({ isOpen, onClose, onSave, item }) => {
    const [form, setForm] = useState({ type: 'entrada_compra', quantity: '', reference: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm({ type: 'entrada_compra', quantity: '', reference: '' });
            setError('');
        }
    }, [isOpen]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const qty = Number(form.quantity);
        if (!qty || qty <= 0) {
            setError('La cantidad debe ser mayor a 0');
            return;
        }

        setSaving(true);
        try {
            await onSave({ type: form.type, quantity: qty, reference: form.reference });
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al ajustar stock');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !item) return null;

    const selectedType = ADJUSTMENT_TYPES.find(t => t.value === form.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Ajuste de stock</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{item.name}</p>
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${selectedType?.bg}`}>
                        <span className="text-sm text-gray-600">Stock actual</span>
                        <span className={`text-lg font-bold ${selectedType?.color}`}>
                            {item.currentStock} {item.unit}
                        </span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
                        <div className="space-y-2">
                            {ADJUSTMENT_TYPES.map(t => (
                                <label key={t.value} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value={t.value}
                                        checked={form.type === t.value}
                                        onChange={handleChange}
                                        className="text-green-600"
                                    />
                                    <span className={`text-sm font-medium ${t.color}`}>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                name="quantity"
                                value={form.quantity}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                placeholder="0"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-500 w-20 truncate">{item.unit}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Referencia <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input
                            type="text"
                            name="reference"
                            value={form.reference}
                            onChange={handleChange}
                            placeholder="Ej: Factura #123, Merma por vencimiento..."
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
                            {saving ? 'Guardando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustModal;
