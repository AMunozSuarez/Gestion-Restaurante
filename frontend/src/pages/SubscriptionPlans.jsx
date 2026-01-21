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
    const icons = {
      trial: '🎁',
      monthly: '📅',
      quarterly: '📊',
      yearly: '⭐',
    };
    return icons[planId] || '📦';
  };

  const getPlanColor = (planId) => {
    const colors = {
      trial: 'from-green-400 to-green-600',
      monthly: 'from-blue-400 to-blue-600',
      quarterly: 'from-purple-400 to-purple-600',
      yearly: 'from-amber-400 to-amber-600',
    };
    return colors[planId] || 'from-gray-400 to-gray-600';
  };

  const getPopularBadge = (planId) => {
    return planId === 'quarterly' ? (
      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
        Más Popular
      </div>
    ) : null;
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
                      <div className="text-6xl mb-4">{getPlanIcon(currentSubscription.plan)}</div>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Elige el plan perfecto para tu restaurante
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Sin límites de pedidos ni empleados
          </p>
          <p className="text-lg text-gray-500">
            Todas las funciones incluidas en todos los planes
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                selectedPlan === plan.id ? 'ring-4 ring-blue-500' : ''
              }`}
            >
              {getPopularBadge(plan.id)}
              
              {/* Plan Header */}
              <div className={`bg-gradient-to-r ${getPlanColor(plan.id)} p-6 text-white`}>
                <div className="text-5xl mb-2">{getPlanIcon(plan.id)}</div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">
                  {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
                </div>
                <p className="text-sm opacity-90">{plan.duration} días</p>
              </div>

              {/* Plan Features */}
              <div className="p-6">
                <ul className="space-y-3 mb-6">
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
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{plan.features.maxLocations} {plan.features.maxLocations === 1 ? 'ubicación' : 'ubicaciones'}</span>
                  </li>
                  {plan.features.advancedReports && (
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Reportes avanzados</span>
                    </li>
                  )}
                  {plan.features.apiAccess && (
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Acceso API</span>
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
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.id === 'quarterly'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  } ${
                    selectedPlan === plan.id
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-xl transform hover:-translate-y-0.5'
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
                    'Probar Gratis'
                  ) : (
                    'Seleccionar Plan'
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            ¿Por qué elegirnos?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Fácil de usar</h3>
              <p className="text-gray-600">Interfaz intuitiva diseñada para restaurantes</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold mb-2">Pago seguro</h3>
              <p className="text-gray-600">Integración con MercadoPago</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-xl font-semibold mb-2">Soporte 24/7</h3>
              <p className="text-gray-600">Siempre disponibles para ayudarte</p>
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
