import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionPending = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Pending Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-yellow-100 p-6">
            <svg
              className="w-20 h-20 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Pending Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pago Pendiente
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Tu pago está siendo procesado
          </p>
          <p className="text-gray-500">
            Esto puede tomar algunos minutos. Te notificaremos cuando tu suscripción esté activa
          </p>
        </div>

        {/* Information Box */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">
            ¿Qué significa esto?
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Algunos métodos de pago requieren confirmación adicional o pueden tardar en procesarse.
            </p>
            <p>
              <strong>Recibirás un email</strong> cuando tu pago sea confirmado y tu suscripción esté activa.
            </p>
          </div>
        </div>

        {/* Status Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="rounded-full bg-green-500 text-white w-8 h-8 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Solicitud recibida</p>
                  <p className="text-xs text-gray-500">Completado</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-500 text-white w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Procesando pago</p>
                  <p className="text-xs text-gray-500">En proceso...</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <div className="rounded-full bg-gray-300 text-white w-8 h-8 flex items-center justify-center text-sm">
                  3
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Suscripción activa</p>
                  <p className="text-xs text-gray-400">Pendiente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            Actualizar estado
          </button>
          <button
            onClick={() => navigate('/mostrador')}
            className="w-full bg-white text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 border-2 border-gray-300"
          >
            Volver al inicio
          </button>
        </div>

        {/* Support Contact */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Si tienes dudas, contáctanos en <br />
            <a href="mailto:soporte@gestion-restaurante.cl" className="text-blue-600 hover:underline font-medium">
              soporte@gestion-restaurante.cl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPending;
