import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui';
import {
  getAllSubscriptions,
  getSubscriptionStats,
  confirmManualPayment,
} from '../services/subscriptionService';

const SubscriptionAdmin = () => {
  const [activeTab, setActiveTab] = useState('stats'); // stats, subscriptions, testing
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testingData, setTestingData] = useState({
    restaurantId: '',
    plan: 'monthly',
  });

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'subscriptions') {
      loadSubscriptions();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await getAllSubscriptions();
      if (response.success) {
        setSubscriptions(response.data);
      }
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (subscriptionId) => {
    if (!window.confirm('¿Confirmar pago manual para esta suscripción?')) {
      return;
    }

    try {
      const response = await confirmManualPayment(subscriptionId, {
        amount: 20000,
        invoiceUrl: '',
        notes: 'Pago manual confirmado por admin',
      });

      if (response.success) {
        alert('Pago confirmado exitosamente');
        loadSubscriptions();
      }
    } catch (error) {
      alert('Error al confirmar pago: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-blue-100 text-blue-700',
      expired: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      suspended: 'bg-orange-100 text-orange-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel de Administración - Suscripciones
          </h1>
          <p className="text-gray-600">
            Gestiona y monitorea todas las suscripciones del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Suscripciones
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeTab === 'testing'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🧪 Testing
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Activas</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Expiradas</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.expired}</p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-full">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Canceladas</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.cancelled}</p>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-full">
                        <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Ingresos Mensuales</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(stats.monthlyRevenue)}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Plan Distribution */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Distribución por Plan
                  </h3>
                  <div className="space-y-4">
                    {stats.planDistribution?.map((plan) => (
                      <div key={plan._id} className="flex items-center">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {plan._id}
                            </span>
                            <span className="text-sm text-gray-600">
                              {plan.count} suscripciones
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(plan.count / stats.active) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Restaurante
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subscriptions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {sub.restaurant?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sub.restaurant?.email || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 capitalize font-medium">
                              {sub.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                sub.status
                              )}`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(sub.endDate).toLocaleDateString('es-CL')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(sub.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {sub.status === 'pending' && (
                              <button
                                onClick={() => handleConfirmPayment(sub._id)}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                Confirmar Pago
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Testing Tab */}
            {activeTab === 'testing' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Crear Suscripción de Prueba
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID del Restaurante
                      </label>
                      <input
                        type="text"
                        value={testingData.restaurantId}
                        onChange={(e) =>
                          setTestingData({ ...testingData, restaurantId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: 507f1f77bcf86cd799439011"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan
                      </label>
                      <select
                        value={testingData.plan}
                        onChange={(e) =>
                          setTestingData({ ...testingData, plan: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="trial">Trial (7 días)</option>
                        <option value="monthly">Mensual ($20.000)</option>
                        <option value="quarterly">Trimestral ($50.000)</option>
                        <option value="yearly">Anual ($180.000)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => alert('Funcionalidad de testing en desarrollo')}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                      Crear Suscripción de Prueba
                    </button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Links de Testing
                  </h3>
                  <div className="space-y-3">
                    <a
                      href="/subscription/plans"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-medium text-blue-900">Ver Planes</div>
                      <div className="text-sm text-blue-600">/subscription/plans</div>
                    </a>
                    <a
                      href="/subscription/success?payment_id=test123"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div className="font-medium text-green-900">Página de Éxito</div>
                      <div className="text-sm text-green-600">/subscription/success</div>
                    </a>
                    <a
                      href="/subscription/failure"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <div className="font-medium text-red-900">Página de Fallo</div>
                      <div className="text-sm text-red-600">/subscription/failure</div>
                    </a>
                    <a
                      href="/subscription/pending"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <div className="font-medium text-yellow-900">Página Pendiente</div>
                      <div className="text-sm text-yellow-600">/subscription/pending</div>
                    </a>
                  </div>
                </Card>

                <Card className="p-6 bg-gray-50">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Información de Testing
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>
                      <strong>Tarjetas de prueba MercadoPago:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        <strong>Aprobada:</strong> 5031 7557 3453 0604 | CVV: 123 | Fecha: 11/25
                      </li>
                      <li>
                        <strong>Rechazada:</strong> 5031 4332 1540 6351 | CVV: 123 | Fecha: 11/25
                      </li>
                      <li>
                        <strong>Pendiente:</strong> 5031 4851 5000 4462 | CVV: 123 | Fecha: 11/25
                      </li>
                    </ul>
                    <p className="mt-4">
                      <strong>Webhook URL:</strong>
                      <code className="ml-2 px-2 py-1 bg-gray-200 rounded">
                        {process.env.REACT_APP_API_URL}/webhooks/mercadopago
                      </code>
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionAdmin;
