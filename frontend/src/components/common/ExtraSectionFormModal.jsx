import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    TrashIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Button, Modal } from '../ui';

const emptyExtra = () => ({ name: '', price: 0, isAvailable: true });

const ExtraSectionFormModal = ({ isOpen, onClose, onSubmit, section = null, isLoading = false }) => {
    const [formData, setFormData] = useState({ sectionName: '', extras: [] });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (section) {
            setFormData({
                sectionName: section.sectionName || '',
                extras: section.extras ? section.extras.map(e => ({ ...e })) : []
            });
        } else {
            setFormData({ sectionName: '', extras: [] });
        }
        setErrors({});
    }, [section, isOpen]);

    const validate = () => {
        const newErrors = {};
        if (!formData.sectionName.trim()) {
            newErrors.sectionName = 'El nombre de la sección es requerido';
        }
        formData.extras.forEach((extra, i) => {
            if (!extra.name.trim()) {
                newErrors[`extra_${i}`] = 'El nombre del extra es requerido';
            }
            if (extra.price < 0) {
                newErrors[`extra_price_${i}`] = 'El precio no puede ser negativo';
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit({
            sectionName: formData.sectionName.trim(),
            extras: formData.extras
        });
    };

    const addExtra = () => {
        setFormData(prev => ({ ...prev, extras: [...prev.extras, emptyExtra()] }));
    };

    const removeExtra = (index) => {
        setFormData(prev => ({ ...prev, extras: prev.extras.filter((_, i) => i !== index) }));
    };

    const updateExtra = (index, field, value) => {
        setFormData(prev => {
            const extras = [...prev.extras];
            extras[index] = { ...extras[index], [field]: value };
            return { ...prev, extras };
        });
    };

    const moveExtra = (index, direction) => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= formData.extras.length) return;
        setFormData(prev => {
            const extras = [...prev.extras];
            [extras[index], extras[target]] = [extras[target], extras[index]];
            return { ...prev, extras };
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={section ? 'Editar Sección de Extras' : 'Nueva Sección de Extras'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Sección <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.sectionName}
                        onChange={e => setFormData(prev => ({ ...prev, sectionName: e.target.value }))}
                        placeholder="Ej: Bebidas, Acompañamientos, Salsas"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                            errors.sectionName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        autoFocus
                    />
                    {errors.sectionName && <p className="text-xs text-red-600 mt-1">{errors.sectionName}</p>}
                </div>

                {/* Extras */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Extras ({formData.extras.length})
                        </label>
                        <Button type="button" size="sm" onClick={addExtra}>
                            <PlusIcon className="w-3 h-3 mr-1" />
                            Agregar Extra
                        </Button>
                    </div>

                    {formData.extras.length === 0 && (
                        <div className="text-xs text-gray-500 italic p-4 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50">
                            Sin extras. Haz clic en "Agregar Extra" para comenzar.
                        </div>
                    )}

                    {formData.extras.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 border-b border-gray-200">
                                <div className="col-span-5">Nombre</div>
                                <div className="col-span-3">Precio</div>
                                <div className="col-span-2 text-center">Estado</div>
                                <div className="col-span-2 text-center">Acción</div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {formData.extras.map((extra, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-gray-50">
                                        <div className="col-span-5">
                                            <input
                                                type="text"
                                                value={extra.name}
                                                onChange={e => updateExtra(i, 'name', e.target.value)}
                                                placeholder="Nombre"
                                                className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                                    errors[`extra_${i}`] ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                            />
                                            {errors[`extra_${i}`] && (
                                                <p className="text-xs text-red-600">{errors[`extra_${i}`]}</p>
                                            )}
                                        </div>
                                        <div className="col-span-3">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={extra.price}
                                                    onChange={e => updateExtra(i, 'price', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => updateExtra(i, 'isAvailable', !extra.isAvailable)}
                                                className={`p-1.5 rounded transition-colors ${
                                                    extra.isAvailable
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                }`}
                                                title={extra.isAvailable ? 'Disponible' : 'No disponible'}
                                            >
                                                {extra.isAvailable ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="col-span-2 flex justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveExtra(i, 'up')}
                                                disabled={i === 0}
                                                className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ArrowUpIcon className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveExtra(i, 'down')}
                                                disabled={i === formData.extras.length - 1}
                                                className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ArrowDownIcon className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeExtra(i)}
                                                className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isLoading} disabled={isLoading}>
                        {section ? 'Guardar Cambios' : 'Crear Sección'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ExtraSectionFormModal;
