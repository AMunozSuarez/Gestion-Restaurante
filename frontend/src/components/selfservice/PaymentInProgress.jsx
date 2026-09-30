import React from 'react';
import { CreditCardIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';

/**
 * Pantalla mientras el cliente paga en el POS. El estado lo decide el backend (que consulta
 * a Haulmer); aquí solo se muestra.
 *
 *  - pending/sent  → "Acerca tu tarjeta al POS"
 *  - processing    → "Procesando tu pago…"
 *  - completed     → "Pago aprobado, creando tu pedido…" (SelfService finaliza el pedido)
 *  - canceled/failed → opciones de reintentar, pagar en caja o volver
 *
 * A propósito NO hay botón "Cancelar" mientras el cobro está activo, y la pantalla tampoco
 * vuelve sola al inicio: Haulmer no expone una API para cancelar remotamente, así que nada
 * de lo que se haga en el kiosco detendría el cobro en el POS. La única salida real es
 * cancelarlo ahí; recién entonces el estado cambia a `canceled` y aparece la pantalla de
 * abajo (canceled/failed) con la opción de volver al inicio.
 */

const FAILED_TEXT = {
  canceled: { title: 'Pago cancelado', message: 'El pago se canceló en el lector de tarjetas.' },
  failed: { title: 'Pago rechazado', message: 'No se pudo completar el pago con tu tarjeta.' },
};

const PaymentInProgress = ({
  session,
  isTimedOut,
  allowPayAtCounter,
  onRetry,
  onPayAtCounter,
  onDismiss,
}) => {
  const status = session?.status;
  const methodLabel = session?.paymentMethod === 'credito' ? 'crédito' : 'débito';

  if (status === 'canceled' || status === 'failed') {
    const text = FAILED_TEXT[status];
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
        <XCircleIcon className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-5xl font-bold text-gray-900 mb-3">{text.title}</h1>
        <p className="text-2xl text-gray-600 mb-2">{text.message}</p>
        {session?.errorMessage && <p className="text-xl text-gray-500 mb-2">{session.errorMessage}</p>}
        <p className="text-2xl text-gray-600 mb-10">No se realizó ningún cargo por este pedido.</p>

        <div className="w-full max-w-xl flex flex-col gap-3">
          <KioskButton size="xl" fullWidth onClick={onRetry}>Intentar de nuevo</KioskButton>
          {allowPayAtCounter && (
            <KioskButton size="lg" fullWidth variant="secondary" onClick={onPayAtCounter}>Pagar en caja</KioskButton>
          )}
          <KioskButton size="lg" fullWidth variant="ghost" onClick={onDismiss}>Cancelar pedido</KioskButton>
        </div>
      </div>
    );
  }

  if (status === 'completed' || status === 'finalizing' || status === 'consumed') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
        <CheckCircleIcon className="w-24 h-24 text-green-600 mb-6" />
        <h1 className="text-5xl font-bold text-gray-900 mb-3">¡Pago aprobado!</h1>
        <p className="text-2xl text-gray-600">Estamos enviando tu pedido a la cocina…</p>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mt-10" />
      </div>
    );
  }

  const processing = status === 'processing';

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-orange-200 animate-ping opacity-60" />
        <div className="relative rounded-full bg-orange-100 p-10">
          <CreditCardIcon className="w-24 h-24 text-orange-600" />
        </div>
      </div>

      <h1 className="text-5xl font-bold text-gray-900 mb-3">
        {processing ? 'Procesando tu pago…' : 'Paga en el lector de tarjetas'}
      </h1>
      <p className="text-3xl text-gray-600 mb-2">
        {processing
          ? 'No retires tu tarjeta hasta que termine.'
          : `Acerca, inserta o desliza tu tarjeta de ${methodLabel}.`}
      </p>
      {typeof session?.amount === 'number' && (
        <p className="text-4xl font-bold text-gray-900 mt-6 mb-10">{formatChileanCurrency(session.amount)}</p>
      )}

      {/* Sin botón: nadie puede interrumpir un cobro en curso desde el kiosco. La única forma
          de volver al inicio es cancelar la transacción en el propio lector. */}
      {isTimedOut && (
        <p className="text-xl text-amber-700 max-w-xl">
          Esto está tomando más tiempo de lo normal. Si no vas a pagar, cancela la transacción
          en el lector de tarjetas para volver al inicio.
        </p>
      )}
    </div>
  );
};

export default PaymentInProgress;
