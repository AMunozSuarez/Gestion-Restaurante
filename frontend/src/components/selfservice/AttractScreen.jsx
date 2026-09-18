import React from 'react';
import {
  HandRaisedIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';

/**
 * Pantalla de atracción y, a la vez, todos los estados en que el kiosco no puede tomar
 * pedidos. Se resuelven aquí porque el cliente final ve lo mismo: una pantalla de espera.
 * Nunca se muestran mensajes técnicos — siempre se le dice qué hacer.
 */

const StateScreen = ({ icon: Icon, title, message, children, tone = 'neutral' }) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-center px-8">
    <div className={`rounded-full p-8 mb-8 ${tone === 'warning' ? 'bg-amber-100' : 'bg-orange-100'}`}>
      <Icon className={`w-24 h-24 ${tone === 'warning' ? 'text-amber-600' : 'text-orange-600'}`} />
    </div>
    <h1 className="text-5xl font-bold text-gray-900 mb-4 max-w-3xl">{title}</h1>
    <p className="text-2xl text-gray-600 max-w-2xl leading-relaxed">{message}</p>
    {children && <div className="mt-12">{children}</div>}
  </div>
);

const AttractScreen = ({
  restaurantName,
  selfServiceEnabled,
  cashRegisterOpen,
  hasProducts,
  isLoading,
  error,
  onStart,
}) => {
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-orange-600 mb-6" />
        <p className="text-2xl text-gray-500">Cargando el menú…</p>
      </div>
    );
  }

  if (error) {
    return (
      <StateScreen
        icon={ExclamationTriangleIcon}
        tone="warning"
        title="No podemos mostrar el menú"
        message="Por favor acércate al mostrador para hacer tu pedido."
      />
    );
  }

  if (selfServiceEnabled === false) {
    return (
      <StateScreen
        icon={ExclamationTriangleIcon}
        tone="warning"
        title="Autoservicio no disponible"
        message="Por favor realiza tu pedido en el mostrador."
      />
    );
  }

  // Sin caja abierta el backend rechaza el pedido, así que no se ofrece empezar. El botón
  // se OCULTA en vez de deshabilitarse: un botón gris invita a insistir.
  if (!cashRegisterOpen) {
    return (
      <StateScreen
        icon={ClockIcon}
        tone="warning"
        title="Aún no estamos atendiendo"
        message="Por favor realiza tu pedido en el mostrador. Esta pantalla se habilitará sola cuando abramos."
      />
    );
  }

  if (!hasProducts) {
    return (
      <StateScreen
        icon={InboxIcon}
        tone="warning"
        title="Menú no disponible"
        message="Por ahora no hay productos para pedir desde aquí. Acércate al mostrador."
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="h-full w-full flex flex-col items-center justify-center text-center px-8 focus:outline-none group"
    >
      <div className="rounded-full bg-orange-100 p-10 mb-10 transition-transform duration-300 group-active:scale-95">
        <HandRaisedIcon className="w-32 h-32 text-orange-600" />
      </div>

      {restaurantName && (
        <p className="text-3xl text-gray-500 mb-3">{restaurantName}</p>
      )}

      <h1 className="text-7xl font-bold text-gray-900 mb-6">
        Haz tu pedido aquí
      </h1>
      <p className="text-3xl text-gray-600 mb-14">
        Elige lo que quieras y paga en caja
      </p>

      <KioskButton size="xl" className="pointer-events-none animate-pulse">
        Toca para comenzar
      </KioskButton>
    </button>
  );
};

export default AttractScreen;
