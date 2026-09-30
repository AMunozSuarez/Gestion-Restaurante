import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';

/**
 * Elección del medio de pago. La API de pago remoto exige indicar crédito o débito antes de
 * enviar el cobro al POS, así que se le pregunta al cliente aquí.
 *
 * `cooldownUntil` (timestamp) bloquea los botones de tarjeta: Haulmer admite un solo cobro
 * por minuto por terminal, y reintentar antes solo devuelve otro rechazo.
 */
const PaymentMethodStep = ({
  total,
  cardAvailable,
  allowPayAtCounter,
  cooldownUntil,
  isSubmitting,
  onSelectCard,
  onPayAtCounter,
  onBack,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const cooldownSeconds = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const cardDisabled = !cardAvailable || cooldownSeconds > 0 || isSubmitting;

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center gap-4 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 text-lg disabled:opacity-40"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          Volver
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">¿Cómo quieres pagar?</h1>
          <p className="text-3xl text-gray-600 mb-10">
            Total: <span className="font-bold text-gray-900">{formatChileanCurrency(total)}</span>
          </p>

          {cardAvailable ? (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <KioskButton size="xl" disabled={cardDisabled} onClick={() => onSelectCard('credito')} className="min-h-[160px] flex-col">
                <CreditCardIcon className="w-14 h-14" />
                Crédito
              </KioskButton>
              <KioskButton size="xl" disabled={cardDisabled} onClick={() => onSelectCard('debito')} className="min-h-[160px] flex-col">
                <CreditCardIcon className="w-14 h-14" />
                Débito
              </KioskButton>
            </div>
          ) : (
            <p className="text-2xl text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 mb-6">
              El pago con tarjeta no está disponible en este momento.
              {!allowPayAtCounter && ' Por favor acércate al mostrador.'}
            </p>
          )}

          {cardAvailable && cooldownSeconds > 0 && (
            <p className="text-2xl text-gray-600 mb-6">
              El lector de tarjetas se está preparando. Podrás pagar en {cooldownSeconds} s.
            </p>
          )}

          {allowPayAtCounter && (
            <KioskButton size="lg" variant="secondary" fullWidth disabled={isSubmitting} onClick={onPayAtCounter}>
              <BanknotesIcon className="w-8 h-8" />
              Pagar en caja
            </KioskButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodStep;
