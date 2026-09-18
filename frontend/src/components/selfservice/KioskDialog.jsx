import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';

/**
 * Diálogo bloqueante a pantalla completa. No se usa el Modal de components/ui porque ese
 * está limitado a max-w-* y tiene tipografía de escritorio.
 *
 * No se cierra tocando el fondo: en un kiosco, cerrar por accidente un aviso importante es
 * peor que obligar a elegir una de las acciones.
 */
const KioskDialog = ({ title, message, children, actions = [] }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8">
    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-10 text-center">
      <div className="rounded-full bg-amber-100 p-6 w-fit mx-auto mb-6">
        <ExclamationTriangleIcon className="w-16 h-16 text-amber-600" />
      </div>

      <h2 className="text-4xl font-bold text-gray-900 mb-3">{title}</h2>
      {message && <p className="text-2xl text-gray-600 leading-relaxed">{message}</p>}

      {children && <div className="mt-6 text-left">{children}</div>}

      <div className="flex flex-col gap-3 mt-10">
        {actions.map((action) => (
          <KioskButton
            key={action.label}
            size="lg"
            fullWidth
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </KioskButton>
        ))}
      </div>
    </div>
  </div>
);

export default KioskDialog;
