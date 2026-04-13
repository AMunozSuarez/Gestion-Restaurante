import React, { useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon, 
  ChevronUpIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { Button } from '../ui';

const ExtraSectionsManager = ({ extraSections = [], onChange }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());

  const toggleSection = (index) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const addSection = () => {
    const newSections = [...extraSections, {
      sectionName: '',
      maxSelection: null,
      extras: []
    }];
    onChange(newSections);
    // Auto-expandir la nueva sección
    setExpandedSections(new Set([...expandedSections, extraSections.length]));
  };

  const removeSection = (index) => {
    if (window.confirm('¿Estás seguro de eliminar esta sección y todos sus extras?')) {
      const newSections = extraSections.filter((_, i) => i !== index);
      onChange(newSections);
      const newExpanded = new Set();
      expandedSections.forEach((expandedIndex) => {
        if (expandedIndex === index) {
          return;
        }

        if (expandedIndex > index) {
          newExpanded.add(expandedIndex - 1);
          return;
        }

        newExpanded.add(expandedIndex);
      });
      setExpandedSections(newExpanded);
    }
  };

  const moveSection = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= extraSections.length) {
      return;
    }

    const newSections = [...extraSections];
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    onChange(newSections);

    const newExpanded = new Set();
    expandedSections.forEach((expandedIndex) => {
      if (expandedIndex === index) {
        newExpanded.add(targetIndex);
        return;
      }

      if (expandedIndex === targetIndex) {
        newExpanded.add(index);
        return;
      }

      newExpanded.add(expandedIndex);
    });
    setExpandedSections(newExpanded);
  };

  const updateSection = (index, field, value) => {
    const newSections = [...extraSections];
    newSections[index] = {
      ...newSections[index],
      [field]: value
    };
    onChange(newSections);
  };

  const addExtra = (sectionIndex) => {
    const newSections = [...extraSections];
    newSections[sectionIndex].extras = [
      ...newSections[sectionIndex].extras,
      { name: '', price: 0, isAvailable: true }
    ];
    onChange(newSections);
  };

  const removeExtra = (sectionIndex, extraIndex) => {
    const newSections = [...extraSections];
    newSections[sectionIndex].extras = newSections[sectionIndex].extras.filter((_, i) => i !== extraIndex);
    onChange(newSections);
  };

  const updateExtra = (sectionIndex, extraIndex, field, value) => {
    const newSections = [...extraSections];
    newSections[sectionIndex].extras[extraIndex] = {
      ...newSections[sectionIndex].extras[extraIndex],
      [field]: value
    };
    onChange(newSections);
  };

  const moveExtra = (sectionIndex, extraIndex, direction) => {
    const targetIndex = direction === 'up' ? extraIndex - 1 : extraIndex + 1;
    const currentExtras = Array.isArray(extraSections[sectionIndex]?.extras)
      ? extraSections[sectionIndex].extras
      : [];

    if (targetIndex < 0 || targetIndex >= currentExtras.length) {
      return;
    }

    const reorderedExtras = [...currentExtras];
    [reorderedExtras[extraIndex], reorderedExtras[targetIndex]] = [reorderedExtras[targetIndex], reorderedExtras[extraIndex]];

    const newSections = [...extraSections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      extras: reorderedExtras
    };

    onChange(newSections);
  };

  return (
    <div className="space-y-4">
      {/* Header con info y botón */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opciones Extras (Opcional)
          </label>
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Organiza los extras en secciones (ej: "Bebidas", "Acompañamientos"). 
              Cada sección puede tener un límite de selección.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addSection}
          className="flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Agregar Sección
        </Button>
      </div>

      {extraSections.length === 0 && (
        <div className="text-sm text-gray-500 italic p-6 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
          <p className="font-medium mb-1">Sin extras configurados</p>
          <p className="text-xs">Este producto no tendrá opciones adicionales</p>
        </div>
      )}

      {/* Lista de secciones */}
      <div className="space-y-3">
        {extraSections.map((section, sectionIndex) => {
          const isExpanded = expandedSections.has(sectionIndex);
          const hasExtras = section.extras && section.extras.length > 0;
          
          return (
            <div 
              key={sectionIndex} 
              className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header de la sección - Colapsable */}
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  isExpanded ? 'bg-orange-50 border-b-2 border-orange-200' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => toggleSection(sectionIndex)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Icono de expansión */}
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-orange-600" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                  
                  {/* Título de la sección */}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {section.sectionName || `Sección ${sectionIndex + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {hasExtras ? (
                        <>
                          {section.extras.length} extra{section.extras.length !== 1 ? 's' : ''}
                          {section.maxSelection !== null && section.maxSelection !== undefined && (
                            <span className="ml-2 text-orange-600">
                              • Máx: {section.maxSelection}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">Sin extras</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(sectionIndex, 'up');
                    }}
                    disabled={sectionIndex === 0}
                    className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Mover sección hacia arriba"
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(sectionIndex, 'down');
                    }}
                    disabled={sectionIndex === extraSections.length - 1}
                    className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Mover sección hacia abajo"
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                  </button>

                  {/* Botón eliminar sección */}
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(sectionIndex);
                    }}
                    className="ml-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Contenido de la sección (colapsable) */}
              {isExpanded && (
                <div className="p-4 space-y-4 bg-white">
                  {/* Nombre de la sección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Sección <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={section.sectionName}
                      onChange={(e) => updateSection(sectionIndex, 'sectionName', e.target.value)}
                      placeholder="Ej: Bebidas, Acompañamientos, Salsas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Límite de selección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Límite de Selección
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={section.maxSelection === null ? '' : section.maxSelection}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                          updateSection(sectionIndex, 'maxSelection', value);
                        }}
                        placeholder="Ilimitado"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Define cuántos extras puede elegir el cliente de esta sección
                    </p>
                  </div>

                  {/* Lista de extras */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Extras de esta sección
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addExtra(sectionIndex)}
                        className="text-xs"
                      >
                        <PlusIcon className="w-3 h-3 mr-1" />
                        Agregar Extra
                      </Button>
                    </div>

                    {!hasExtras && (
                      <div className="text-xs text-gray-500 italic p-4 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50">
                        No hay extras en esta sección. Click en "Agregar Extra" para comenzar.
                      </div>
                    )}

                    {/* Tabla de extras */}
                    {hasExtras && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Header de la tabla */}
                        <div className="bg-gray-50 px-3 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 border-b border-gray-200">
                          <div className="col-span-5">Nombre</div>
                          <div className="col-span-3">Precio</div>
                          <div className="col-span-2 text-center">Estado</div>
                          <div className="col-span-2 text-center">Acción</div>
                        </div>

                        {/* Filas de extras */}
                        <div className="divide-y divide-gray-200">
                          {section.extras.map((extra, extraIndex) => (
                            <div key={extraIndex} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-gray-50 transition-colors">
                              {/* Nombre del extra */}
                              <div className="col-span-5">
                                <input
                                  type="text"
                                  value={extra.name}
                                  onChange={(e) => updateExtra(sectionIndex, extraIndex, 'name', e.target.value)}
                                  placeholder="Nombre del extra"
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  required
                                />
                              </div>

                              {/* Precio del extra */}
                              <div className="col-span-3">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={extra.price}
                                    onChange={(e) => updateExtra(sectionIndex, extraIndex, 'price', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                </div>
                              </div>

                              {/* Disponibilidad */}
                              <div className="col-span-2 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => updateExtra(sectionIndex, extraIndex, 'isAvailable', !extra.isAvailable)}
                                  className={`p-1.5 rounded transition-colors ${
                                    extra.isAvailable 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                  }`}
                                  title={extra.isAvailable ? 'Disponible' : 'No disponible'}
                                >
                                  {extra.isAvailable ? (
                                    <EyeIcon className="w-4 h-4" />
                                  ) : (
                                    <EyeSlashIcon className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Eliminar extra */}
                              <div className="col-span-2 flex justify-center">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveExtra(sectionIndex, extraIndex, 'up')}
                                    disabled={extraIndex === 0}
                                    className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Mover extra hacia arriba"
                                  >
                                    <ArrowUpIcon className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => moveExtra(sectionIndex, extraIndex, 'down')}
                                    disabled={extraIndex === section.extras.length - 1}
                                    className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Mover extra hacia abajo"
                                  >
                                    <ArrowDownIcon className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeExtra(sectionIndex, extraIndex)}
                                    className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Eliminar extra"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExtraSectionsManager;
