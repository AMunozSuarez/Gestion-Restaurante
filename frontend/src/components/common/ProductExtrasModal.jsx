import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../ui';
import { formatChileanCurrency } from '../../utils/dateUtils';

const ProductExtrasModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  product, 
  initialSelectedExtras
}) => {
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const wasOpenRef = useRef(false);
  const initialExtrasRef = useRef(initialSelectedExtras);

  // Clave de agrupación: por extraId cuando el pedido ya lo trae (estable ante un
  // renombre posterior), o por nombre para pedidos guardados antes de ese campo.
  const buildExtraKey = (extra) => (extra?.extraId ? `id:${extra.extraId}` : `name:${extra?.sectionName}|${extra?.extraName}`);

  const normalizeInitialExtras = (extras = []) => {
    const extrasMap = new Map();

    extras.forEach((extra) => {
      if (!extra?.sectionName || !extra?.extraName) {
        return;
      }

      const key = buildExtraKey(extra);
      const quantity = extra.quantity && extra.quantity > 0 ? extra.quantity : 1;

      if (extrasMap.has(key)) {
        const existing = extrasMap.get(key);
        existing.quantity += quantity;
      } else {
        extrasMap.set(key, {
          sectionId: extra.sectionId || null,
          extraId: extra.extraId || null,
          sectionName: extra.sectionName,
          extraName: extra.extraName,
          price: extra.price || 0,
          quantity
        });
      }
    });

    return Array.from(extrasMap.values());
  };

  const flattenSelectedExtras = (extras = []) => {
    return extras.flatMap((extra) => {
      const quantity = extra.quantity || 0;

      return Array.from({ length: quantity }, () => ({
        sectionId: extra.sectionId || null,
        extraId: extra.extraId || null,
        sectionName: extra.sectionName,
        extraName: extra.extraName,
        price: extra.price || 0
      }));
    });
  };

  // Mantener referencia actualizada de initialSelectedExtras
  initialExtrasRef.current = initialSelectedExtras;

  useEffect(() => {
    // Inicializar cuando el modal se abre (transición de cerrado a abierto)
    if (isOpen && !wasOpenRef.current) {
      const extras = Array.isArray(initialExtrasRef.current) ? initialExtrasRef.current : [];
      setSelectedExtras(normalizeInitialExtras(extras));
      setSectionErrors({});
    }
    // Limpiar cuando el modal se cierra (transición de abierto a cerrado)
    if (!isOpen && wasOpenRef.current) {
      setSelectedExtras([]);
      setSectionErrors({});
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (!product || !product.extraSections || product.extraSections.length === 0) {
    return null;
  }

  /**
   * Normaliza cada asignación de sección al formato que el modal necesita:
   * { sectionName, maxSelection, extras[] }
   * Soporta tanto el formato antiguo (objeto con sectionName directo)
   * como el nuevo ({ section: {...}, maxSelectionOverride, visibleExtraIds }).
   */
  const getEffectiveSections = () => {
    return product.extraSections.map(assignment => {
      // Formato nuevo: { section: { sectionName, extras }, maxSelection, visibleExtraIds }
      if (assignment.section && typeof assignment.section === 'object') {
        const sec = assignment.section;
        const effectiveMax = assignment.maxSelection ?? null;
        const visibleIds = assignment.visibleExtraIds || [];
        const allExtras = sec.extras || [];
        const extras = visibleIds.length > 0
          ? allExtras.filter(e => visibleIds.some(id => id.toString() === (e._id || e).toString()))
          : allExtras;
        return { sectionId: sec._id ? String(sec._id) : null, sectionName: sec.sectionName, maxSelection: effectiveMax, extras };
      }
      // Formato antiguo (pre-migración): el objeto tiene sectionName y extras directamente.
      // Si Mongoose ya aplicó el esquema nuevo sobre datos viejos, extras puede ser undefined.
      return {
        sectionId: null,
        sectionName: assignment.sectionName || '',
        maxSelection: assignment.maxSelection ?? null,
        extras: assignment.extras || [],
      };
    }).filter(s => s.sectionName); // descartar entradas sin nombre (datos aún no migrados)
  };

  const effectiveSections = getEffectiveSections();

  // Compara una selección guardada contra una sección/extra en vivo: por id cuando
  // ambos lados lo tienen (estable ante un renombre), por nombre si no.
  const matchesSection = (selected, section) => (selected.sectionId && section.sectionId
    ? String(selected.sectionId) === String(section.sectionId)
    : selected.sectionName === section.sectionName);

  const matchesExtra = (selected, section, extra) => (selected.extraId && extra._id
    ? String(selected.extraId) === String(extra._id)
    : matchesSection(selected, section) && selected.extraName === extra.name);

  const getSectionSelectedCount = (section, extrasState = selectedExtras) => {
    return extrasState
      .filter(e => matchesSection(e, section))
      .reduce((sum, extra) => sum + (extra.quantity || 0), 0);
  };

  const getExtraQuantity = (section, extra) => {
    const selectedExtra = selectedExtras.find(e => matchesExtra(e, section, extra));

    return selectedExtra?.quantity || 0;
  };

  const clearSectionError = (sectionName) => {
    setSectionErrors(prev => {
      if (!prev[sectionName]) {
        return prev;
      }

      const newErrors = { ...prev };
      delete newErrors[sectionName];
      return newErrors;
    });
  };

  const setSectionLimitError = (sectionName, maxSelection) => {
    setSectionErrors(prev => ({
      ...prev,
      [sectionName]: `Máximo ${maxSelection} ${maxSelection === 1 ? 'opción' : 'opciones'} permitida${maxSelection === 1 ? '' : 's'}`
    }));
  };

  const handleIncrementExtra = (section, extra) => {
    const sectionName = section.sectionName;
    const maxSelection = section.maxSelection;

    setSelectedExtras(prev => {
      const currentCount = getSectionSelectedCount(section, prev);
      const hasMaxSelection = maxSelection !== null && maxSelection !== undefined;

      if (hasMaxSelection && currentCount >= maxSelection) {
        setSectionLimitError(sectionName, maxSelection);
        return prev;
      }

      const existingIndex = prev.findIndex(e => matchesExtra(e, section, extra));

      let updated;
      if (existingIndex >= 0) {
        updated = prev.map((selectedExtra, index) =>
          index === existingIndex
            ? { ...selectedExtra, quantity: (selectedExtra.quantity || 0) + 1 }
            : selectedExtra
        );
      } else {
        updated = [
          ...prev,
          {
            sectionId: section.sectionId || null,
            extraId: extra._id ? String(extra._id) : null,
            sectionName,
            extraName: extra.name,
            price: extra.price || 0,
            quantity: 1
          }
        ];
      }

      clearSectionError(sectionName);
      return updated;
    });
  };

  const handleDecrementExtra = (section, extra) => {
    setSelectedExtras(prev => {
      const existingIndex = prev.findIndex(e => matchesExtra(e, section, extra));

      if (existingIndex < 0) {
        return prev;
      }

      const target = prev[existingIndex];
      if ((target.quantity || 0) <= 1) {
        return prev.filter((_, index) => index !== existingIndex);
      }

      return prev.map((selectedExtra, index) =>
        index === existingIndex
          ? { ...selectedExtra, quantity: (selectedExtra.quantity || 0) - 1 }
          : selectedExtra
      );
    });

    clearSectionError(section.sectionName);
  };

  const calculateExtrasTotal = () => {
    return selectedExtras.reduce((sum, extra) => sum + ((extra.price || 0) * (extra.quantity || 0)), 0);
  };

  const getTotalSelectedExtras = () => {
    return selectedExtras.reduce((sum, extra) => sum + (extra.quantity || 0), 0);
  };

  const handleConfirm = () => {
    onConfirm(flattenSelectedExtras(selectedExtras));
    onClose();
  };

  const extrasTotal = calculateExtrasTotal();
  const totalSelectedExtras = getTotalSelectedExtras();
  const totalWithExtras = (product.price || 0) + extrasTotal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Seleccionar extras para: ${product.name || product.title}`}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {effectiveSections.map((section, sectionIndex) => {
          const availableExtras = section.extras.filter(e => e.isAvailable);
          
          if (availableExtras.length === 0) {
            return null; // No mostrar secciones sin extras disponibles
          }

          const selectedCount = getSectionSelectedCount(section);
          const hasMaxSelection = section.maxSelection !== null && section.maxSelection !== undefined;

          return (
            <div key={sectionIndex} className="border border-gray-200 rounded-lg p-4">
              {/* Header de la sección */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {section.sectionName}
                  </h3>
                  {hasMaxSelection && (
                    <span className="text-xs text-gray-500">
                      {selectedCount}/{section.maxSelection} seleccionado{section.maxSelection === 1 ? '' : 's'}
                    </span>
                  )}
                  {!hasMaxSelection && selectedCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {selectedCount} seleccionado{selectedCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {sectionErrors[section.sectionName] && (
                  <p className="text-xs text-red-600 mt-1">
                    {sectionErrors[section.sectionName]}
                  </p>
                )}
              </div>

              {/* Lista de extras */}
              <div className="space-y-2">
                {availableExtras.map((extra, extraIndex) => {
                  const quantity = getExtraQuantity(section, extra);
                  const isSelected = quantity > 0;
                  const disableIncrement = hasMaxSelection && selectedCount >= section.maxSelection;

                  return (
                    <div
                      key={extraIndex}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-orange-500 bg-orange-50' 
                          : disableIncrement 
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-orange-300 bg-white'
                        }
                      `}
                      onClick={() => {
                        if (!disableIncrement) {
                          handleIncrementExtra(section, extra);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isSelected ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-600 px-2 text-xs font-bold text-white">
                            {quantity}
                          </span>
                        ) : (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500">
                            0
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {extra.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>
                          {extra.price > 0 ? `+${formatChileanCurrency(extra.price)}` : 'Gratis'}
                        </span>

                        {quantity > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecrementExtra(section, extra);
                            }}
                            className="h-7 w-7 rounded-full border border-orange-300 text-orange-600 hover:bg-orange-100"
                            aria-label={`Quitar una unidad de ${extra.name}`}
                          >
                            -
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!disableIncrement) {
                              handleIncrementExtra(section, extra);
                            }
                          }}
                          disabled={disableIncrement}
                          className={`h-7 w-7 rounded-full border font-semibold ${
                            disableIncrement
                              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                              : 'border-orange-300 text-orange-600 hover:bg-orange-100'
                          }`}
                          aria-label={`Agregar una unidad de ${extra.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Resumen de precios */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Producto base:</span>
            <span className="font-medium">{formatChileanCurrency(product.price || 0)}</span>
          </div>
          {extrasTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Extras seleccionados:</span>
              <span className="font-medium text-orange-600">+{formatChileanCurrency(extrasTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total:</span>
            <span className="text-orange-600">{formatChileanCurrency(totalWithExtras)}</span>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
        >
          Confirmar ({totalSelectedExtras} extra{totalSelectedExtras === 1 ? '' : 's'})
        </Button>
      </div>
    </Modal>
  );
};

export default ProductExtrasModal;
