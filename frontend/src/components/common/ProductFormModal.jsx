import React, { useState, useEffect, useRef } from 'react';
import {
    XMarkIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    PuzzlePieceIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '../ui';
import useExtraSectionsManagement from '../../hooks/useExtraSectionsManagement';
import productsService from '../../services/productsService';
import { resolveMediaUrl, hasRealImage } from '../../utils/mediaUrl';

/**
 * assignment: { section: id, maxSelection: null|number, visibleExtraIds: [] }
 * Cuando se envía al backend, enviamos exactamente esa forma.
 */

const ProductFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    product = null,
    categories = [],
    isLoading = false
}) => {
    const titleInputRef = useRef(null);
    const { sections: allSections, isLoading: sectionsLoading } = useExtraSectionsManagement();
    const [sectionSearch, setSectionSearch] = useState('');
    const [showSectionPicker, setShowSectionPicker] = useState(false);
    const [expandedAssignments, setExpandedAssignments] = useState(new Set());
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageError, setImageError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        imageUrl: '',
        category: '',
        isAvailable: true,
        showInDigitalMenu: true,
        extraSections: [] // [{ section: id, maxSelection: null|number, visibleExtraIds: [] }]
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (product) {
            // extraSections puede tener objetos poblados ({ section: {...}, ... }) o IDs
            const assignments = (product.extraSections || []).map(a => {
                if (typeof a === 'object' && a.section) {
                    const secId = typeof a.section === 'object' ? a.section._id : a.section;
                    return {
                        section: secId,
                        maxSelection: a.maxSelection ?? null,
                        visibleExtraIds: (a.visibleExtraIds || []).map(id =>
                            typeof id === 'object' ? id.toString() : id
                        )
                    };
                }
                // Sin section válida: datos pre-migración donde Mongoose descartó los campos
                // embebidos. No podemos reconstruirlos, así que se descartan silenciosamente.
                return null;
            }).filter(Boolean);
            setFormData({
                title: product.title || '',
                description: product.description || '',
                price: product.price || '',
                imageUrl: product.imageUrl || '',
                category: product.category?._id || product.category || '',
                isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
                showInDigitalMenu: product.showInDigitalMenu !== undefined ? product.showInDigitalMenu : true,
                extraSections: assignments
            });
        } else {
            setFormData({
                title: '',
                description: '',
                price: '',
                imageUrl: '',
                category: '',
                isAvailable: true,
                showInDigitalMenu: true,
                extraSections: []
            });
        }
        setErrors({});
        setImageError('');
        setSectionSearch('');
        setShowSectionPicker(false);
        setExpandedAssignments(new Set());
    }, [product, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => titleInputRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageError('');
        setIsUploadingImage(true);
        try {
            const result = await productsService.uploadImage(file);
            if (result.success) {
                setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
            } else {
                setImageError(result.message || 'No se pudo subir la imagen');
            }
        } catch (error) {
            setImageError(error.message);
        } finally {
            setIsUploadingImage(false);
            e.target.value = '';
        }
    };

    // -- Sección asignada: helpers --

    const getAssignedSectionData = (sectionId) =>
        allSections.find(s => s._id === sectionId);

    const assignSection = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            extraSections: [...prev.extraSections, {
                section: sectionId,
                maxSelection: null,
                visibleExtraIds: []
            }]
        }));
        setSectionSearch('');
        setShowSectionPicker(false);
    };

    const removeAssignment = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            extraSections: prev.extraSections.filter(a => a.section !== sectionId)
        }));
        setExpandedAssignments(prev => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
        });
    };

    const updateAssignment = (sectionId, field, value) => {
        setFormData(prev => ({
            ...prev,
            extraSections: prev.extraSections.map(a =>
                a.section === sectionId ? { ...a, [field]: value } : a
            )
        }));
    };

    const toggleExtraVisibility = (sectionId, extraId, checked) => {
        const sectionData = getAssignedSectionData(sectionId);
        const assignment = formData.extraSections.find(a => a.section === sectionId);
        if (!sectionData || !assignment) return;

        let currentVisible = assignment.visibleExtraIds.length > 0
            ? [...assignment.visibleExtraIds]
            : sectionData.extras.map(e => e._id); // todos seleccionados por defecto

        if (checked) {
            if (!currentVisible.includes(extraId)) currentVisible.push(extraId);
        } else {
            currentVisible = currentVisible.filter(id => id !== extraId);
        }

        // Si están todos seleccionados, volver a [] (= todos)
        const allIds = sectionData.extras.map(e => e._id);
        const isAllSelected = allIds.every(id => currentVisible.includes(id));
        updateAssignment(sectionId, 'visibleExtraIds', isAllSelected ? [] : currentVisible);
    };

    const isExtraVisible = (assignment, extraId) => {
        if (!assignment.visibleExtraIds || assignment.visibleExtraIds.length === 0) return true;
        return assignment.visibleExtraIds.includes(extraId);
    };

    const toggleAssignmentExpanded = (sectionId) => {
        setExpandedAssignments(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    };

    // Secciones disponibles para agregar
    const assignedIds = formData.extraSections.map(a => a.section);
    const availableSections = allSections.filter(s =>
        !assignedIds.includes(s._id) &&
        s.sectionName.toLowerCase().includes(sectionSearch.toLowerCase())
    );

    const validateForm = () => {
        const newErrors = {};
        const parsedPrice = parseFloat(formData.price);
        if (!formData.title.trim()) newErrors.title = 'El nombre del producto es requerido';
        if (formData.price === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
            newErrors.price = 'El precio no puede ser negativo';
        }
        if (!formData.category) newErrors.category = 'La categoría es requerida';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        await onSubmit({ ...formData, price: parseFloat(formData.price) });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product ? 'Editar Producto' : 'Crear Producto'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            ref={titleInputRef}
                            label="Nombre del Producto"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            error={errors.title}
                            placeholder="Ej: Hamburguesa Clásica"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-brown-700 mb-1">Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            rows={3}
                            placeholder="Descripción del producto..."
                        />
                    </div>

                    <Input
                        label="Precio"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        error={errors.price}
                        placeholder="0.00"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-brown-700 mb-1">Categoría</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                errors.category ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        >
                            <option value="">Seleccionar categoría</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.title || cat.name}</option>
                            ))}
                        </select>
                        {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-brown-700 mb-1">Imagen (Opcional)</label>
                        <div className="flex items-center gap-3">
                            {hasRealImage(formData.imageUrl) && (
                                <div className="relative">
                                    <img
                                        src={resolveMediaUrl(formData.imageUrl)}
                                        alt="Vista previa"
                                        className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                        className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm"
                                        title="Quitar imagen"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={isUploadingImage}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                                />
                                {isUploadingImage && <p className="text-xs text-gray-400 mt-1">Subiendo imagen...</p>}
                                {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex flex-wrap gap-6">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="isAvailable"
                                checked={formData.isAvailable}
                                onChange={handleChange}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-brown-700">Producto disponible</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="showInDigitalMenu"
                                checked={formData.showInDigitalMenu}
                                onChange={handleChange}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-brown-700">Mostrar en menú online</label>
                        </div>
                    </div>

                    {/* ── Secciones de Extras ── */}
                    <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center gap-2">
                            <PuzzlePieceIcon className="w-4 h-4 text-orange-500" />
                            <label className="block text-sm font-medium text-gray-700">
                                Secciones de Extras
                            </label>
                        </div>

                        {/* Lista de asignaciones */}
                        <div className="space-y-2">
                            {formData.extraSections.length === 0 && (
                                <p className="text-xs text-gray-400 italic">
                                    Sin secciones asignadas — el producto no tendrá extras
                                </p>
                            )}

                            {formData.extraSections.map((assignment) => {
                                const secData = getAssignedSectionData(assignment.section);
                                if (!secData) return null;
                                const isExpanded = expandedAssignments.has(assignment.section);
                                const overrideVal = assignment.maxSelection;

                                return (
                                    <div key={assignment.section} className="border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Header de la asignación */}
                                        <div
                                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer select-none transition-colors ${
                                                isExpanded ? 'bg-orange-50 border-b border-orange-100' : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                            onClick={() => toggleAssignmentExpanded(assignment.section)}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {isExpanded
                                                    ? <ChevronUpIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                    : <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                }
                                                <span className="font-medium text-sm text-gray-800 truncate">
                                                    {secData.sectionName}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                                                    {overrideVal !== null
                                                        ? `Máx. ${overrideVal}`
                                                        : 'Sin límite'
                                                    }
                                                    {' · '}
                                                    {assignment.visibleExtraIds.length === 0
                                                        ? `${secData.extras?.length || 0} extras`
                                                        : `${assignment.visibleExtraIds.length}/${secData.extras?.length || 0} extras`
                                                    }
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeAssignment(assignment.section); }}
                                                className="ml-2 p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                                                title="Quitar sección"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Panel de overrides (expandible) */}
                                        {isExpanded && (
                                            <div className="px-4 py-3 space-y-4 bg-white">
                                                {/* Límite de selección */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Límite de selección
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={overrideVal === null ? '' : overrideVal}
                                                        onChange={e => updateAssignment(
                                                            assignment.section,
                                                            'maxSelection',
                                                            e.target.value === '' ? null : Number(e.target.value)
                                                        )}
                                                        placeholder="Vacío = sin límite"
                                                        className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Cuántos extras puede elegir el cliente de esta sección
                                                    </p>
                                                </div>

                                                {/* Selección de extras visibles */}
                                                {secData.extras && secData.extras.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-xs font-medium text-gray-600">
                                                                Extras visibles en este producto
                                                            </label>
                                                            <div className="flex gap-2 text-xs">
                                                                <button
                                                                    type="button"
                                                                    className="text-orange-500 hover:text-orange-700"
                                                                    onClick={() => updateAssignment(assignment.section, 'visibleExtraIds', [])}
                                                                >
                                                                    Todos
                                                                </button>
                                                                <span className="text-gray-300">|</span>
                                                                <button
                                                                    type="button"
                                                                    className="text-orange-500 hover:text-orange-700"
                                                                    onClick={() => updateAssignment(assignment.section, 'visibleExtraIds', secData.extras.map(e => e._id))}
                                                                >
                                                                    Ninguno
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {secData.extras.map(extra => {
                                                                const visible = isExtraVisible(assignment, extra._id);
                                                                return (
                                                                    <label
                                                                        key={extra._id}
                                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                                                                            visible ? 'bg-orange-50 text-gray-800' : 'bg-gray-50 text-gray-400'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={visible}
                                                                            onChange={e => toggleExtraVisibility(assignment.section, extra._id, e.target.checked)}
                                                                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                                                        />
                                                                        <span className="truncate flex-1">{extra.name}</span>
                                                                        {extra.price > 0 && (
                                                                            <span className="text-xs text-orange-500 flex-shrink-0">
                                                                                +${extra.price}
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {assignment.visibleExtraIds.length === 0
                                                                ? 'Mostrando todos los extras'
                                                                : `Mostrando ${assignment.visibleExtraIds.length} de ${secData.extras.length}`
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botón / buscador para agregar secciones */}
                        {!showSectionPicker ? (
                            <button
                                type="button"
                                onClick={() => setShowSectionPicker(true)}
                                disabled={sectionsLoading}
                                className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 border border-dashed border-orange-300 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Agregar sección de extras
                            </button>
                        ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={sectionSearch}
                                        onChange={e => setSectionSearch(e.target.value)}
                                        placeholder="Buscar sección..."
                                        className="flex-1 text-sm bg-transparent outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setShowSectionPicker(false); setSectionSearch(''); }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {availableSections.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-4">
                                            {sectionSearch ? 'Sin resultados' :
                                                allSections.length === 0
                                                    ? 'No hay secciones. Ve a Productos → Extras.'
                                                    : 'Todas las secciones ya están asignadas'}
                                        </p>
                                    ) : (
                                        availableSections.map(section => (
                                            <button
                                                key={section._id}
                                                type="button"
                                                onClick={() => assignSection(section._id)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                            >
                                                <div>
                                                    <span className="font-medium text-gray-800">{section.sectionName}</span>
                                                    {section.maxSelection !== null && section.maxSelection !== undefined && (
                                                        <span className="text-xs text-gray-400 ml-2">Máx. {section.maxSelection}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400 ml-3">{section.extras?.length || 0} extras</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-gray-400">
                            Gestiona las secciones en{' '}
                            <span className="font-medium text-orange-500">Productos → Extras</span>
                        </p>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isLoading} disabled={isLoading || isUploadingImage}>
                        {product ? 'Actualizar' : 'Crear'} Producto
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductFormModal;
