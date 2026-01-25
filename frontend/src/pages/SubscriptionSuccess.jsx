import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPayment } from '../services/subscriptionService';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    verifyPaymentStatus();
  }, []);

  const verifyPaymentStatus = async () => {
    try {
      // Verificar si es activación de plan trial (gratuito)
      const isTrial = searchParams.get('trial') === 'true';
      
      if (isTrial) {
        setStatus('success');
        setMessage('¡Tu período de prueba gratuito ha sido activado exitosamente!');
        setSubscriptionData({
          subscription: {
            plan: 'trial',
            status: 'active'
          },
          isTrial: true
        });
        return;
      }

      // MercadoPago envía estos parámetros automáticamente:
      // payment_id, status, external_reference, merchant_order_id
      const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
      const externalReference = searchParams.get('external_reference');
      const paymentStatus = searchParams.get('status');
      const collectionStatus = searchParams.get('collection_status');

      console.log('Parámetros recibidos de MercadoPago:', {
        paymentId,
        externalReference,
        paymentStatus,
        collectionStatus,
        allParams: Object.fromEntries(searchParams),
      });

      // Si no hay payment_id, mostrar instrucciones
      if (!paymentId) {
        setStatus('manual');
        setMessage('Para verificar tu pago, copia el payment_id de la URL de MercadoPago');
        return;
      }

      // Verificar el pago con el backend
      const response = await verifyPayment(paymentId, externalReference);

      if (response.success) {
        setStatus('success');
        setSubscriptionData(response.data);
        setMessage('¡Tu suscripción ha sido activada exitosamente!');
      } else {
        setStatus('error');
        setMessage('Hubo un problema al verificar tu pago');
      }
    } catch (error) {
      console.error('Error al verificar pago:', error);
      setStatus('error');
      setMessage('Error al procesar la verificación del pago');
    }
  };

  const handleContinue = () => {
    navigate('/mostrador');
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verificando tu pago...
          </h2>
          <p className="text-gray-600">
            Por favor espera mientras confirmamos tu suscripción
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-6">
              <svg
                className="w-20 h-20 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {subscriptionData?.isTrial ? '¡Prueba Gratuita Activada!' : '¡Pago Exitoso!'}
            </h1>
            <p className="text-xl text-gray-600 mb-2">{message}</p>
            <p className="text-gray-500">
              {subscriptionData?.isTrial 
                ? 'Tienes 7 días para probar todas las funcionalidades sin costo'
                : 'Ya puedes disfrutar de todas las funcionalidades de tu plan'}
            </p>
          </div>

          {/* Subscription Details */}
          {subscriptionData && !subscriptionData.isTrial && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detalles de tu suscripción
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-semibold text-gray-900">
                    {subscriptionData.subscription?.plan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estado:</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Activo
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Fecha de inicio:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(subscriptionData.subscription?.startDate).toLocaleDateString('es-CL')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Válido hasta:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(subscriptionData.subscription?.endDate).toLocaleDateString('es-CL')}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Monto pagado:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                    }).format(subscriptionData.payment?.amount || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {subscriptionData?.isTrial ? 'Comenzar a usar el sistema' : 'Ir al sistema'}
            </button>
            {!subscriptionData?.isTrial && (
              <button
                onClick={() => navigate('/subscription/plans')}
                className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 border-2 border-gray-300"
              >
                Ver planes
              </button>
            )}
          </div>

          {/* Email Confirmation Note or Trial Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            {subscriptionData?.isTrial ? (
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2 text-center">🎉 ¡Bienvenido a tu prueba gratuita!</p>
                <ul className="space-y-1 text-left">
                  <li>✓ Acceso completo a todas las funcionalidades por 7 días</li>
                  <li>✓ Sin necesidad de tarjeta de crédito</li>
                  <li>✓ Podrás actualizar a un plan de pago cuando lo desees</li>
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center">
                📧 Te hemos enviado un correo de confirmación con los detalles de tu suscripción
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Manual verification state (localhost)
  if (status === 'manual') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Verificación Manual
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              En modo localhost, debes verificar el pago manualmente.
            </p>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-left mt-6">
              <h3 className="font-bold text-blue-900 mb-3">Instrucciones:</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Después de pagar, busca en la URL de MercadoPago el parámetro <code className="bg-blue-100 px-2 py-1 rounded">payment_id=XXXX</code></li>
                <li>Copia el número del payment_id</li>
                <li>Agrega <code className="bg-blue-100 px-2 py-1 rounded">?payment_id=XXXX</code> a esta URL</li>
                <li>Recarga la página</li>
              </ol>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              En producción, la redirección es automática.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/mostrador')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Hubo un problema
          </h1>
          <p className="text-lg text-gray-600 mb-2">{message}</p>
          <p className="text-gray-500">
            Por favor contacta a soporte si el problema persiste
          </p>
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
            ¿Necesitas ayuda? Escríbenos a <br />
            <a href="mailto:soporte@gestion-restaurante.cl" className="text-blue-600 hover:underline font-medium">
              soporte@gestion-restaurante.cl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
