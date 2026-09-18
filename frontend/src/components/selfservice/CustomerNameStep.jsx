import React, { useState } from 'react';
import { ArrowLeftIcon, BackspaceIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { MAX_CUSTOMER_NAME_LENGTH, MAX_COMMENT_LENGTH } from '../../constants/selfService';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

/**
 * Paso de identificación del pedido.
 *
 * Usa un teclado propio en pantalla en vez de un <input> nativo a propósito: en una tablet
 * Windows el input dispara el teclado virtual del sistema, que tapa media pantalla y es
 * difícil de cerrar sin salir del modo kiosco. El comentario sí usa textarea porque es
 * opcional y admite texto libre.
 */
const CustomerNameStep = ({
  requireCustomerName,
  allowOrderComment,
  onBack,
  onConfirm,
  isSubmitting,
}) => {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');

  const appendChar = (char) => {
    setName((prev) => (prev.length >= MAX_CUSTOMER_NAME_LENGTH ? prev : prev + char));
  };

  const backspace = () => setName((prev) => prev.slice(0, -1));

  const canContinue = !requireCustomerName || name.trim().length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center gap-4 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 text-lg"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          Volver
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
            {requireCustomerName ? '¿A nombre de quién?' : '¿Algo más?'}
          </h1>
          <p className="text-xl text-gray-500 text-center mb-8">
            {requireCustomerName
              ? 'Te llamaremos por tu nombre cuando esté listo'
              : 'Puedes dejar una nota para la cocina'}
          </p>

          {requireCustomerName && (
            <>
              <div className="bg-white border-2 border-gray-300 rounded-2xl px-6 py-5 mb-6 min-h-[88px] flex items-center">
                <span className={`text-3xl ${name ? 'text-gray-900' : 'text-gray-300'}`}>
                  {name || 'Tu nombre'}
                </span>
                <span className="ml-1 w-0.5 h-9 bg-orange-600 animate-pulse" />
              </div>

              <div className="space-y-2 mb-8">
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-2">
                    {row.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => appendChar(char)}
                        className="w-[9%] min-w-[52px] h-16 rounded-xl bg-white border border-gray-300 text-2xl font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-200"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                ))}

                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => appendChar(' ')}
                    className="flex-1 max-w-sm h-16 rounded-xl bg-white border border-gray-300 text-xl font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-200"
                  >
                    Espacio
                  </button>
                  <button
                    type="button"
                    onClick={backspace}
                    aria-label="Borrar"
                    className="w-32 h-16 rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-300 active:bg-gray-400"
                  >
                    <BackspaceIcon className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </>
          )}

          {allowOrderComment && (
            <div className="mb-6">
              <label htmlFor="kiosk-comment" className="block text-xl font-semibold text-gray-900 mb-2">
                Nota para la cocina (opcional)
              </label>
              <textarea
                id="kiosk-comment"
                value={comment}
                maxLength={MAX_COMMENT_LENGTH}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Ej: sin cebolla"
                className="w-full rounded-2xl border-2 border-gray-300 px-5 py-4 text-xl focus:outline-none focus:border-orange-500"
              />
              <p className="text-base text-gray-400 mt-1 text-right">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <KioskButton
            size="xl"
            fullWidth
            disabled={!canContinue || isSubmitting}
            onClick={() => onConfirm({ customerName: name.trim(), comment: comment.trim() })}
          >
            {isSubmitting ? 'Enviando…' : 'Confirmar pedido'}
          </KioskButton>
        </div>
      </div>
    </div>
  );
};

export default CustomerNameStep;
