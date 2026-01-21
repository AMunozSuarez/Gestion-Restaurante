import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-6">
            <svg
              className="w-20 h-20 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pago Rechazado
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Tu pago no pudo ser procesado
          </p>
          <p className="text-gray-500">
            Esto puede deberse a fondos insuficientes, datos incorrectos de la tarjeta u otro problema con el método de pago
          </p>
        </div>

        {/* Suggestions */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">
            ¿Qué puedes hacer?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Verifica los datos de tu tarjeta</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Asegúrate de tener fondos suficientes</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Intenta con otro método de pago</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Contacta a tu banco si el problema persiste</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/subscription/plans')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            Intentar de nuevo
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
            ¿Necesitas ayuda? Contáctanos <br />
            <a href="mailto:soporte@gestion-restaurante.cl" className="text-blue-600 hover:underline font-medium">
              soporte@gestion-restaurante.cl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFailure;
