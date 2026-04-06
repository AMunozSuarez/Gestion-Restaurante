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

  // Mantener referencia actualizada de initialSelectedExtras
  initialExtrasRef.current = initialSelectedExtras;

  useEffect(() => {
    // Inicializar cuando el modal se abre (transición de cerrado a abierto)
    if (isOpen && !wasOpenRef.current) {
      const extras = Array.isArray(initialExtrasRef.current) ? initialExtrasRef.current : [];
      setSelectedExtras(extras);
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

  const handleToggleExtra = (sectionName, extra) => {
    const extraKey = `${sectionName}|${extra.name}`;
    const isSelected = selectedExtras.some(e => 
      e.sectionName === sectionName && e.extraName === extra.name
    );

    if (isSelected) {
      // Deseleccionar
      setSelectedExtras(prev => prev.filter(e => 
        !(e.sectionName === sectionName && e.extraName === extra.name)
      ));
      // Limpiar error de esta sección si existe
      setSectionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[sectionName];
        return newErrors;
      });
    } else {
      // Verificar límite de selección
      const section = product.extraSections.find(s => s.sectionName === sectionName);
      const currentCount = selectedExtras.filter(e => e.sectionName === sectionName).length;
      
      if (section.maxSelection !== null && section.maxSelection !== undefined && currentCount >= section.maxSelection) {
        // Mostrar error
        setSectionErrors(prev => ({
          ...prev,
          [sectionName]: `Máximo ${section.maxSelection} ${section.maxSelection === 1 ? 'opción' : 'opciones'} permitida${section.maxSelection === 1 ? '' : 's'}`
        }));
        return;
      }

      // Seleccionar
      setSelectedExtras(prev => [...prev, {
        sectionName,
        extraName: extra.name,
        price: extra.price
      }]);
      // Limpiar error de esta sección si existe
      setSectionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[sectionName];
        return newErrors;
      });
    }
  };

  const isExtraSelected = (sectionName, extraName) => {
    return selectedExtras.some(e => 
      e.sectionName === sectionName && e.extraName === extraName
    );
  };

  const getSectionSelectedCount = (sectionName) => {
    return selectedExtras.filter(e => e.sectionName === sectionName).length;
  };

  const calculateExtrasTotal = () => {
    return selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
  };

  const handleConfirm = () => {
    onConfirm(selectedExtras);
    onClose();
  };

  const extrasTotal = calculateExtrasTotal();
  const totalWithExtras = (product.price || 0) + extrasTotal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Seleccionar extras para: ${product.name || product.title}`}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {product.extraSections.map((section, sectionIndex) => {
          const availableExtras = section.extras.filter(e => e.isAvailable);
          
          if (availableExtras.length === 0) {
            return null; // No mostrar secciones sin extras disponibles
          }

          const selectedCount = getSectionSelectedCount(section.sectionName);
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
                  const isSelected = isExtraSelected(section.sectionName, extra.name);
                  const isDisabled = !isSelected && hasMaxSelection && selectedCount >= section.maxSelection;

                  return (
                    <label
                      key={extraIndex}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-orange-500 bg-orange-50' 
                          : isDisabled 
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-orange-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleExtra(section.sectionName, extra)}
                          disabled={isDisabled}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {extra.name}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>
                        {extra.price > 0 ? `+${formatChileanCurrency(extra.price)}` : 'Gratis'}
                      </span>
                    </label>
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
          Confirmar ({selectedExtras.length} extra{selectedExtras.length === 1 ? '' : 's'})
        </Button>
      </div>
    </Modal>
  );
};

export default ProductExtrasModal;
