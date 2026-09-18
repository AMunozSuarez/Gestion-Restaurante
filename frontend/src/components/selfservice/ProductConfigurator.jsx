import React, { useState } from 'react';
import { ArrowLeftIcon, MinusIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';
import {
  getEffectiveSections,
  getSectionSelectedCount,
  getExtraQuantity,
  calculateExtrasTotal,
  buildSectionLimitMessage,
  hasMaxSelection,
  incrementExtra,
  decrementExtra,
} from '../../utils/extrasSelection';
import { MAX_LINE_QUANTITY } from '../../constants/selfService';

/**
 * Configuración de un producto antes de agregarlo al carrito.
 *
 * Toda la lógica de extras (secciones efectivas, visibleExtraIds, límites, match por id)
 * viene de utils/extrasSelection, el mismo módulo que usa el POS. Aquí solo cambia la
 * presentación: pantalla completa y controles grandes en vez de un modal de escritorio.
 */
const ProductConfigurator = ({
  product,
  initialSelectedExtras = [],
  initialQuantity = 1,
  isEditing = false,
  onCancel,
  onConfirm,
}) => {
  const [selectedExtras, setSelectedExtras] = useState(initialSelectedExtras);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [sectionErrors, setSectionErrors] = useState({});

  const sections = getEffectiveSections(product);

  const clearSectionError = (sectionName) => {
    setSectionErrors((prev) => {
      if (!prev[sectionName]) return prev;
      const next = { ...prev };
      delete next[sectionName];
      return next;
    });
  };

  const handleIncrement = (section, extra) => {
    const { extras, error } = incrementExtra(selectedExtras, section, extra);

    if (error) {
      setSectionErrors((prev) => ({
        ...prev,
        [error.sectionName]: buildSectionLimitMessage(error.maxSelection),
      }));
      return;
    }

    clearSectionError(section.sectionName);
    setSelectedExtras(extras);
  };

  const handleDecrement = (section, extra) => {
    setSelectedExtras(decrementExtra(selectedExtras, section, extra));
    clearSectionError(section.sectionName);
  };

  const extrasPerUnit = calculateExtrasTotal(selectedExtras);
  const lineTotal = ((product.price || 0) + extrasPerUnit) * quantity;

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Cabecera */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 text-lg"
          >
            <ArrowLeftIcon className="w-6 h-6" />
            Volver
          </button>
        </div>

        <div className="flex items-center gap-4 px-5 pb-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <PhotoIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.title}</h1>
            {product.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
            )}
            <p className="text-xl font-semibold text-orange-600 mt-0.5">
              {formatChileanCurrency(product.price || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Secciones de extras */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {sections.map((section) => {
          // Aunque el backend ya filtra los extras no disponibles, se vuelve a filtrar por
          // si el catálogo en pantalla quedó de una carga anterior.
          const availableExtras = section.extras.filter((extra) => extra.isAvailable !== false);
          if (availableExtras.length === 0) return null;

          const selectedCount = getSectionSelectedCount(selectedExtras, section);
          const limited = hasMaxSelection(section);
          const atLimit = limited && selectedCount >= section.maxSelection;
          const error = sectionErrors[section.sectionName];

          return (
            <div key={section.sectionId || section.sectionName} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-baseline justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{section.sectionName}</h2>
                {limited && (
                  <span className={`text-base font-semibold ${atLimit ? 'text-orange-600' : 'text-gray-400'}`}>
                    {selectedCount}/{section.maxSelection}
                  </span>
                )}
              </div>

              {error && (
                <p className="px-5 py-2 bg-amber-50 text-amber-800 text-sm font-medium">{error}</p>
              )}

              <div className="divide-y divide-gray-100">
                {availableExtras.map((extra) => {
                  const extraQuantity = getExtraQuantity(selectedExtras, section, extra);
                  const canAdd = !atLimit;

                  return (
                    <div
                      key={extra._id || extra.name}
                      className={`flex items-center gap-4 px-5 py-3 ${!canAdd && extraQuantity === 0 ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-lg text-gray-900">{extra.name}</p>
                        <p className="text-base text-gray-500">
                          {extra.price > 0 ? `+ ${formatChileanCurrency(extra.price)}` : 'Gratis'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StepperButton
                          onClick={() => handleDecrement(section, extra)}
                          disabled={extraQuantity === 0}
                          label={`Quitar ${extra.name}`}
                        >
                          <MinusIcon className="w-6 h-6" />
                        </StepperButton>

                        <span className="w-9 text-center text-xl font-bold text-gray-900">
                          {extraQuantity}
                        </span>

                        <StepperButton
                          onClick={() => handleIncrement(section, extra)}
                          disabled={!canAdd}
                          label={`Agregar ${extra.name}`}
                          variant="primary"
                        >
                          <PlusIcon className="w-6 h-6" />
                        </StepperButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Cantidad del producto */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
          <div className="flex items-center gap-4">
            <StepperButton
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              label="Disminuir cantidad"
            >
              <MinusIcon className="w-6 h-6" />
            </StepperButton>
            <span className="w-10 text-center text-2xl font-bold text-gray-900">{quantity}</span>
            <StepperButton
              onClick={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
              disabled={quantity >= MAX_LINE_QUANTITY}
              label="Aumentar cantidad"
              variant="primary"
            >
              <PlusIcon className="w-6 h-6" />
            </StepperButton>
          </div>
        </div>
      </div>

      {/* Total y confirmación */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg text-gray-600">Total</span>
          <span className="text-2xl font-bold text-gray-900">{formatChileanCurrency(lineTotal)}</span>
        </div>
        <KioskButton
          size="lg"
          fullWidth
          onClick={() => onConfirm({ selectedExtras, quantity })}
        >
          {isEditing ? 'Guardar cambios' : 'Agregar al pedido'}
        </KioskButton>
      </div>
    </div>
  );
};

const StepperButton = ({ children, onClick, disabled, label, variant = 'secondary' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      variant === 'primary'
        ? 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
    }`}
  >
    {children}
  </button>
);

export default ProductConfigurator;
