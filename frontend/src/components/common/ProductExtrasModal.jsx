import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../ui';
import { formatChileanCurrency } from '../../utils/dateUtils';
import {
  normalizeInitialExtras,
  flattenSelectedExtras,
  getEffectiveSections,
  getSectionSelectedCount,
  getExtraQuantity,
  calculateExtrasTotal,
  getTotalSelectedExtras,
  buildSectionLimitMessage,
  incrementExtra,
  decrementExtra,
} from '../../utils/extrasSelection';

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

  const effectiveSections = getEffectiveSections(product);

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
      [sectionName]: buildSectionLimitMessage(maxSelection)
    }));
  };

  const handleIncrementExtra = (section, extra) => {
    const sectionName = section.sectionName;

    setSelectedExtras(prev => {
      const { extras, error } = incrementExtra(prev, section, extra);

      if (error) {
        setSectionLimitError(error.sectionName, error.maxSelection);
        return prev;
      }

      clearSectionError(sectionName);
      return extras;
    });
  };

  const handleDecrementExtra = (section, extra) => {
    setSelectedExtras(prev => decrementExtra(prev, section, extra));

    clearSectionError(section.sectionName);
  };

  const handleConfirm = () => {
    onConfirm(flattenSelectedExtras(selectedExtras));
    onClose();
  };

  const extrasTotal = calculateExtrasTotal(selectedExtras);
  const totalSelectedExtras = getTotalSelectedExtras(selectedExtras);
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

          const selectedCount = getSectionSelectedCount(selectedExtras, section);
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
                  const quantity = getExtraQuantity(selectedExtras, section, extra);
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
