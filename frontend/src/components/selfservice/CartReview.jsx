import React from 'react';
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';
import { calculateExtrasTotal } from '../../utils/extrasSelection';

/**
 * Resumen del pedido antes de confirmar. El cliente puede cambiar cantidades, editar los
 * extras de una línea o quitarla.
 *
 * Los precios que se muestran son de referencia: el backend recalcula el total con los
 * precios de la base de datos, así que lo que aparece aquí nunca determina lo que se cobra.
 */
const CartReview = ({
  lines,
  total,
  onBack,
  onEditLine,
  onChangeQuantity,
  onRemoveLine,
  onConfirm,
  isSubmitting,
}) => {
  const hasUnavailable = lines.some((line) => line.unavailable);

  if (lines.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
        <div className="rounded-full bg-gray-100 p-6 mb-6">
          <ShoppingCartIcon className="w-16 h-16 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Tu pedido está vacío</h1>
        <p className="text-xl text-gray-500 mb-8">Agrega productos para continuar</p>
        <KioskButton size="lg" onClick={onBack}>Ver el menú</KioskButton>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center gap-4 px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 min-h-[52px] rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 text-base"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          Seguir pidiendo
        </button>
        <h1 className="text-2xl font-bold text-gray-900 ml-auto">Tu pedido</h1>
      </div>

      {hasUnavailable && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-7 h-7 text-amber-600 flex-shrink-0" />
          <p className="text-base text-amber-900">
            Algunos productos ya no están disponibles. Quítalos para poder continuar.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {lines.map((line) => {
          const extrasPerUnit = calculateExtrasTotal(line.selectedExtras);
          const lineTotal = (line.unitPrice + extrasPerUnit) * line.quantity;

          return (
            <div
              key={line.id}
              className={`bg-white rounded-2xl border p-4 ${line.unavailable ? 'border-amber-400 bg-amber-50/40' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{line.title}</h3>
                  <p className="text-base text-gray-500">
                    {formatChileanCurrency(line.unitPrice)} c/u
                  </p>

                  {line.unavailable && (
                    <p className="text-sm font-semibold text-amber-700 mt-1">
                      Ya no está disponible
                    </p>
                  )}

                  {line.selectedExtras.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {line.selectedExtras.map((extra) => (
                        <li
                          key={`${extra.extraId || extra.extraName}-${extra.sectionName}`}
                          className="text-base text-gray-600"
                        >
                          • {extra.quantity > 1 ? `${extra.quantity}× ` : ''}{extra.extraName}
                          {extra.price > 0 && (
                            <span className="text-gray-400"> +{formatChileanCurrency(extra.price)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-xl font-bold text-gray-900 flex-shrink-0">
                  {formatChileanCurrency(lineTotal)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <RoundButton
                    onClick={() => onChangeQuantity(line.id, line.quantity - 1)}
                    label="Disminuir cantidad"
                  >
                    <MinusIcon className="w-6 h-6" />
                  </RoundButton>
                  <span className="w-9 text-center text-xl font-bold text-gray-900">
                    {line.quantity}
                  </span>
                  <RoundButton
                    onClick={() => onChangeQuantity(line.id, line.quantity + 1)}
                    label="Aumentar cantidad"
                    variant="primary"
                  >
                    <PlusIcon className="w-6 h-6" />
                  </RoundButton>
                </div>

                <div className="flex items-center gap-2">
                  {line.hasExtraSections && !line.unavailable && (
                    <button
                      type="button"
                      onClick={() => onEditLine(line)}
                      className="flex items-center gap-2 px-4 min-h-[52px] rounded-xl text-base text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
                    >
                      <PencilIcon className="w-5 h-5" />
                      Editar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.id)}
                    aria-label={`Quitar ${line.title}`}
                    className="flex items-center gap-2 px-4 min-h-[52px] rounded-xl text-base text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200"
                  >
                    <TrashIcon className="w-5 h-5" />
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl text-gray-600">Total a pagar</span>
          <span className="text-3xl font-bold text-gray-900">{formatChileanCurrency(total)}</span>
        </div>
        <KioskButton
          size="xl"
          fullWidth
          onClick={onConfirm}
          disabled={isSubmitting || hasUnavailable}
        >
          {isSubmitting ? 'Enviando…' : 'Confirmar pedido'}
        </KioskButton>
      </div>
    </div>
  );
};

const RoundButton = ({ children, onClick, label, variant = 'secondary' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
      variant === 'primary'
        ? 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
    }`}
  >
    {children}
  </button>
);

export default CartReview;
