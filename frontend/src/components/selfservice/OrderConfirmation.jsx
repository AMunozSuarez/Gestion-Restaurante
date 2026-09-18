import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';
import { CONFIRM_AUTORESET_MS } from '../../constants/selfService';

/**
 * Confirmación del pedido. El número va en grande porque es lo único que el cliente tiene
 * que recordar para pagar y retirar.
 *
 * Tiene su propio temporizador de vuelta a la atracción (no el de inactividad general):
 * aquí sí queremos que la pantalla se limpie sola aunque nadie la toque.
 */
const OrderConfirmation = ({ order, customerName, onDone }) => {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(CONFIRM_AUTORESET_MS / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const timeout = setTimeout(onDone, CONFIRM_AUTORESET_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
      <CheckCircleIcon className="w-24 h-24 text-green-600 mb-6" />

      <h1 className="text-5xl font-bold text-gray-900 mb-2">¡Pedido recibido!</h1>
      {customerName && (
        <p className="text-3xl text-gray-600 mb-8">Gracias, {customerName}</p>
      )}

      <div className="bg-white rounded-3xl border-2 border-orange-200 px-16 py-10 mb-8">
        <p className="text-2xl text-gray-500 mb-2">Tu número de pedido</p>
        <p className="text-9xl font-bold text-orange-600 leading-none">
          {order?.orderNumber ?? '—'}
        </p>
      </div>

      <p className="text-3xl font-semibold text-gray-900 mb-2">
        Paga en caja con este número
      </p>
      {typeof order?.total === 'number' && (
        <p className="text-2xl text-gray-600 mb-10">
          Total: {formatChileanCurrency(order.total)}
        </p>
      )}

      <KioskButton size="lg" variant="secondary" onClick={onDone}>
        Listo{secondsLeft > 0 ? ` (${secondsLeft})` : ''}
      </KioskButton>
    </div>
  );
};

export default OrderConfirmation;
