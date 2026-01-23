import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, initiateCheckout, getCurrentSubscription } from '../services/subscriptionService';
import { Card } from '../components/ui';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Primero verificar si tiene suscripción activa
      await checkCurrentSubscription();
      // Luego cargar los planes disponibles
      await loadPlans();
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentSubscription = async () => {
    try {
      const response = await getCurrentSubscription();
      if (response.success && response.data && response.data.subscription) {
        const subscription = response.data.subscription;
        // Solo considerar como "activa" si el estado es active o el plan es trial y está activo
        if (subscription.status === 'active' || subscription.status === 'trial') {
          setCurrentSubscription(subscription);
          setShowPlans(false); // No mostrar planes si ya tiene suscripción activa
        } else {
          setShowPlans(true); // Mostrar planes si no tiene suscripción activa
        }
      } else {
        setShowPlans(true); // No tiene suscripción, mostrar planes
      }
    } catch (error) {
      console.error('Error al verificar suscripción:', error);
      setShowPlans(true); // En caso de error, mostrar planes
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await getPlans();
      if (response.success) {
        setPlans(response.data);
        setHasUsedTrial(response.hasUsedTrial || false);
      }
    } catch (error) {
      setError('Error al cargar los planes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId) => {
    try {
      setSelectedPlan(planId);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const restaurantId = user.restaurant;

      if (!restaurantId) {
        setError('No se encontró información del restaurante');
        return;
      }

      // Iniciar proceso de checkout
      const response = await initiateCheckout(restaurantId, planId);
      
      if (response.success) {
        // Redirigir a MercadoPago
        const initPoint = response.data.mercadoPago?.initPoint;
        if (initPoint) {
          window.location.href = initPoint;
        } else {
          setError('No se pudo iniciar el proceso de pago');
        }
      }
    } catch (error) {
      setError('Error al iniciar el pago');
      console.error(error);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanIcon = (planId) => {
    const iconComponents = {
      trial: (
        <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      monthly: (
        <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    };
    return iconComponents[planId] || (
      <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    );
  };

  const getPlanColor = (planId) => {
    const colors = {
      trial: 'from-emerald-500 to-teal-600',
      monthly: 'from-blue-600 to-indigo-700',
    };
    return colors[planId] || 'from-gray-400 to-gray-600';
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Activa', color: 'bg-green-100 text-green-800' },
      trial: { text: 'Período de Prueba', color: 'bg-blue-100 text-blue-800' },
      expired: { text: 'Expirada', color: 'bg-red-100 text-red-800' },
      cancelled: { text: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
    };
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getPlanName = (planId) => {
    const planNames = {
      trial: 'Prueba Gratuita',
      monthly: '1 Mes',
      quarterly: '3 Meses',
      yearly: '12 Meses',
    };
    return planNames[planId] || planId;
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        
        {/* Vista cuando hay suscripción activa */}
        {!showPlans && currentSubscription ? (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Tu Suscripción Actual
              </h1>
              <p className="text-xl text-gray-600">
                Detalles de tu plan activo
              </p>
            </div>

            {/* Card principal de suscripción */}
            <div className="max-w-4xl mx-auto mb-8">
              <Card className="overflow-hidden">
                <div className={`bg-gradient-to-r ${getPlanColor(currentSubscription.plan)} p-8 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="mb-4">{getPlanIcon(currentSubscription.plan)}</div>
                      <h2 className="text-3xl font-bold mb-2">
                        Plan {getPlanName(currentSubscription.plan)}
                      </h2>
                      <p className="text-lg opacity-90">
                        {currentSubscription.plan === 'trial' 
                          ? 'Periodo de prueba gratuito' 
                          : `Suscripción ${currentSubscription.plan === 'monthly' ? 'mensual' : currentSubscription.plan === 'quarterly' ? 'trimestral' : 'anual'}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(currentSubscription.status)}
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Fecha de inicio */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Fecha de inicio</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatDate(currentSubscription.startDate)}
                      </p>
                    </div>

                    {/* Fecha de vencimiento */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Fecha de vencimiento</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatDate(currentSubscription.endDate)}
                      </p>
                    </div>

                    {/* Días restantes */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 mb-1">Días restantes</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {getDaysRemaining(currentSubscription.endDate)}
                      </p>
                    </div>

                    {/* Monto */}
                    {currentSubscription.amount && currentSubscription.amount > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-700 mb-1">Monto pagado</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatPrice(currentSubscription.amount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Características del plan */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Características incluidas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Pedidos ilimitados</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Empleados ilimitados</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Reportes avanzados</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Acceso API</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-6 h-6 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">Soporte prioritario</span>
                      </div>
                    </div>
                  </div>

                  {/* Alerta si está por vencer */}
                  {getDaysRemaining(currentSubscription.endDate) <= 7 && getDaysRemaining(currentSubscription.endDate) > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-1">
                            Tu suscripción está por vencer
                          </h4>
                          <p className="text-sm text-yellow-800">
                            Tu plan vence en {getDaysRemaining(currentSubscription.endDate)} días. Renueva ahora para continuar disfrutando de todas las funcionalidades.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => navigate('/mostrador')}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                    >
                      Volver al Sistema
                    </button>
                    <button
                      onClick={() => setShowPlans(true)}
                      className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 border-2 border-gray-300"
                    >
                      {currentSubscription.plan === 'trial' ? 'Actualizar a Plan de Pago' : 'Ver Otros Planes'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Nota informativa */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Información importante
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Tu suscripción se renovará automáticamente al vencer</li>
                      <li>• Puedes cambiar de plan o cancelar en cualquier momento desde Configuración</li>
                      <li>• Para soporte, contáctanos en cualquier momento</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Vista de planes disponibles (cuando no hay suscripción activa o se quiere cambiar) */}
            {currentSubscription && (
              <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-blue-900">Tienes una suscripción activa</p>
                      <p className="text-sm text-blue-700">Plan {getPlanName(currentSubscription.plan)} - Vence el {formatDate(currentSubscription.endDate)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlans(false)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ver Mi Suscripción
                  </button>
                </div>
              </div>
            )}

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full mb-4">
            <span className="text-blue-800 font-semibold text-sm">✨ Precios Especiales de Lanzamiento</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Planes Simples y Transparentes
          </h1>
          <p className="text-xl text-gray-600 mb-2 max-w-2xl mx-auto">
            Sin límites de pedidos ni empleados
          </p>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Todas las funciones premium incluidas. Sin sorpresas.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Mensaje cuando el usuario ya usó el trial */}
        {hasUsedTrial && plans.length === 1 && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    Ya has usado tu período de prueba gratuito
                  </h3>
                  <p className="text-blue-800 leading-relaxed">
                    Esperamos que hayas disfrutado de todas las funcionalidades. Para continuar usando nuestro sistema, selecciona el plan mensual a continuación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className={`mx-auto mb-16 ${
          plans.length === 1 
            ? 'max-w-xl' 
            : 'max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12'
        }`}>
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-105 border-2 ${
                plan.id === 'monthly' 
                  ? 'border-blue-500 shadow-xl shadow-blue-200' 
                  : 'border-gray-200 hover:border-emerald-400'
              } ${
                selectedPlan === plan.id ? 'ring-4 ring-purple-500 scale-105' : ''
              }`}
            >
              
              {/* Plan Header */}
              <div className={`bg-gradient-to-br ${getPlanColor(plan.id)} p-8 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10">
                  <div className="mb-4">{getPlanIcon(plan.id)}</div>
                  <h3 className="text-3xl font-bold mb-3">{plan.name}</h3>
                  <div className="flex items-end mb-2">
                    <span className="text-5xl font-extrabold">
                      {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
                    </span>
                  </div>
                  <p className="text-sm opacity-90 font-medium">{plan.duration} días de acceso completo</p>
                </div>
              </div>

              {/* Plan Features */}
              <div className="p-8 bg-gradient-to-b from-white to-gray-50">
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-1">Incluye:</h4>
                  <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Pedidos ilimitados</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Empleados ilimitados</span>
                  </li>
                  {plan.features.advancedReports && (
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Reportes avanzados</span>
                    </li>
                  )}
                  {plan.features.prioritySupport && (
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Soporte prioritario</span>
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan === plan.id}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.id === 'monthly'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-lg hover:shadow-blue-500/50'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-emerald-500/50'
                  } ${
                    selectedPlan === plan.id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-2xl transform hover:-translate-y-1'
                  }`}
                >
                  {selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando...
                    </span>
                  ) : plan.price === 0 ? (
                    'Comenzar Prueba Gratis'
                  ) : (
                    'Seleccionar Plan'
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-gray-600 text-lg">Todo lo que necesitas para gestionar tu restaurante</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Fácil de usar</h3>
              <p className="text-gray-600 leading-relaxed">Interfaz intuitiva diseñada específicamente para restaurantes</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Pago seguro</h3>
              <p className="text-gray-600 leading-relaxed">Integración con MercadoPago para pagos seguros y confiables</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Soporte dedicado</h3>
              <p className="text-gray-600 leading-relaxed">Equipo de soporte siempre disponible para ayudarte</p>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
