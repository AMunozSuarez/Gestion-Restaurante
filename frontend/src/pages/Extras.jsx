import React, { useState } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { Button, Card } from '../components/ui';
import ExtraSectionFormModal from '../components/common/ExtraSectionFormModal';
import useExtraSectionsManagement from '../hooks/useExtraSectionsManagement';
import { formatChileanCurrency } from '../utils/dateUtils';

const Extras = () => {
    const { sections, isLoading, isSaving, createSection, updateSection, deleteSection } = useExtraSectionsManagement();
    const [showModal, setShowModal] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const filtered = sections.filter(s =>
        s.sectionName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingSection(null);
        setShowModal(true);
    };

    const handleEdit = (section) => {
        setEditingSection(section);
        setShowModal(true);
    };

    const handleDelete = async (section) => {
        if (!window.confirm(`¿Eliminar la sección "${section.sectionName}"? Solo es posible si no está asignada a ningún producto.`)) return;
        const result = await deleteSection(section._id);
        if (result.success) {
            showNotification('Sección eliminada');
        } else {
            showNotification(result.error, 'error');
        }
    };

    const handleSubmit = async (data) => {
        const result = editingSection
            ? await updateSection(editingSection._id, data)
            : await createSection(data);

        if (result.success) {
            setShowModal(false);
            setEditingSection(null);
            showNotification(editingSection ? 'Sección actualizada' : 'Sección creada');
        } else {
            showNotification(result.error, 'error');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PuzzlePieceIcon className="w-8 h-8 text-orange-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-brown-900">Secciones de Extras</h1>
                                <p className="text-sm text-gray-500">
                                    Crea secciones reutilizables y asígnalas a múltiples productos
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleCreate}>
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Nueva Sección
                        </Button>
                    </div>

                    {/* Buscador */}
                    <Card className="p-4">
                        <div className="relative max-w-sm">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar sección..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </Card>

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                        </div>
                    )}

                    {/* Grid de secciones */}
                    {!isLoading && filtered.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map(section => (
                                <Card key={section._id} className="p-4 flex flex-col gap-3">
                                    {/* Encabezado de la sección */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{section.sectionName}</h3>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleEdit(section)}
                                                className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(section)}
                                                className="p-1.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de extras */}
                                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                                        {section.extras && section.extras.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {section.extras.map(extra => (
                                                    <div
                                                        key={extra._id}
                                                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                                                            extra.isAvailable ? '' : 'opacity-40'
                                                        }`}
                                                    >
                                                        <span className="text-gray-800 truncate flex-1">{extra.name}</span>
                                                        <span className="text-orange-600 font-medium ml-2 flex-shrink-0">
                                                            {extra.price > 0 ? formatChileanCurrency(extra.price) : 'Gratis'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic text-center py-3">Sin extras</p>
                                        )}
                                    </div>

                                    {/* Conteo */}
                                    <p className="text-xs text-gray-400 text-right">
                                        {section.extras?.length || 0} extra{section.extras?.length !== 1 ? 's' : ''}
                                        {' · '}
                                        {section.extras?.filter(e => e.isAvailable).length || 0} disponibles
                                    </p>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && filtered.length === 0 && (
                        <Card className="p-12 text-center">
                            <PuzzlePieceIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchTerm ? 'Sin resultados' : 'Sin secciones de extras'}
                            </h3>
                            <p className="text-gray-500 mb-4 text-sm">
                                {searchTerm
                                    ? 'Intenta con otro término de búsqueda'
                                    : 'Crea secciones centralizadas y asígnalas a varios productos a la vez'
                                }
                            </p>
                            {!searchTerm && (
                                <Button onClick={handleCreate}>
                                    <PlusIcon className="w-5 h-5 mr-2" />
                                    Crear Primera Sección
                                </Button>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {/* Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white ${
                    notification.type === 'error' ? 'bg-red-600' : 'bg-teal-600'
                }`}>
                    {notification.type === 'error' ? (
                        <XMarkIcon className="w-5 h-5" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {notification.message}
                </div>
            )}

            <ExtraSectionFormModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingSection(null); }}
                onSubmit={handleSubmit}
                section={editingSection}
                isLoading={isSaving}
            />
        </div>
    );
};

export default Extras;
