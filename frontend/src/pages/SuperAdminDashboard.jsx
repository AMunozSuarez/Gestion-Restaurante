import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  BuildingStorefrontIcon, 
  ChartBarIcon, 
  CreditCardIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import adminService from '../services/adminService';
import { getAllSubscriptions, getSubscriptionStats } from '../services/subscriptionService';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Estados para estadísticas
  const [stats, setStats] = useState(null);
  
  // Estados para usuarios
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilter, setUsersFilter] = useState({ role: 'all', restaurant: 'all' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Estados para restaurantes
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsPage, setRestaurantsPage] = useState(1);
  const [restaurantsTotalPages, setRestaurantsTotalPages] = useState(1);
  const [restaurantsSearch, setRestaurantsSearch] = useState('');
  const [restaurantsFilter, setRestaurantsFilter] = useState({ isActive: 'all' });
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  
  // Estados para suscripciones
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(null);

  // Mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Cargar datos según la pestaña activa
  useEffect(() => {
    switch (activeTab) {
      case 'stats':
        loadStats();
        break;
      case 'users':
        loadUsers();
        break;
      case 'restaurants':
        loadRestaurants();
        break;
      case 'subscriptions':
        loadSubscriptions();
        loadSubscriptionStats();
        break;
      default:
        break;
    }
  }, [activeTab, usersPage, usersSearch, usersFilter, restaurantsPage, restaurantsSearch, restaurantsFilter]);

  // =================== FUNCIONES DE CARGA ===================
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSystemStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      showNotification('Error al cargar estadísticas: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: usersPage,
        limit: 10,
        search: usersSearch,
        ...usersFilter,
      };
      const response = await adminService.getAllUsers(params);
      if (response.success) {
        setUsers(response.users);
        setUsersTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      showNotification('Error al cargar usuarios: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const params = {
        page: restaurantsPage,
        limit: 10,
        search: restaurantsSearch,
        ...restaurantsFilter,
      };
      const response = await adminService.getAllRestaurants(params);
      if (response.success) {
        setRestaurants(response.restaurants);
        setRestaurantsTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error('Error al cargar restaurantes:', error);
      showNotification('Error al cargar restaurantes: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await getAllSubscriptions();
      if (response.success) {
        setSubscriptions(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await getSubscriptionStats();
      if (response.success) {
        setSubscriptionStats(response.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de suscripciones:', error);
    }
  };

  // =================== FUNCIONES DE USUARIOS ===================
  const handleCreateUser = async (userData) => {
    try {
      setLoading(true);
      const response = await adminService.createUser(userData);
      if (response.success) {
        showNotification('Usuario creado exitosamente', 'success');
        setShowUserModal(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (error) {
      showNotification('Error al crear usuario: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      setLoading(true);
      const response = await adminService.updateUser(userId, userData);
      if (response.success) {
        showNotification('Usuario actualizado exitosamente', 'success');
        setShowUserModal(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (error) {
      showNotification('Error al actualizar usuario: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    
    try {
      setLoading(true);
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        showNotification('Usuario eliminado exitosamente', 'success');
        loadUsers();
      }
    } catch (error) {
      showNotification('Error al eliminar usuario: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =================== FUNCIONES DE RESTAURANTES ===================
  const handleCreateRestaurant = async (restaurantData) => {
    try {
      setLoading(true);
      const response = await adminService.createRestaurant(restaurantData);
      if (response.success) {
        showNotification('Restaurante creado exitosamente', 'success');
        setShowRestaurantModal(false);
        setEditingRestaurant(null);
        loadRestaurants();
      }
    } catch (error) {
      showNotification('Error al crear restaurante: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRestaurant = async (restaurantId, restaurantData) => {
    try {
      setLoading(true);
      const response = await adminService.updateRestaurant(restaurantId, restaurantData);
      if (response.success) {
        showNotification('Restaurante actualizado exitosamente', 'success');
        setShowRestaurantModal(false);
        setEditingRestaurant(null);
        loadRestaurants();
      }
    } catch (error) {
      showNotification('Error al actualizar restaurante: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este restaurante? Esto eliminará también todos sus usuarios.')) return;
    
    try {
      setLoading(true);
      const response = await adminService.deleteRestaurant(restaurantId);
      if (response.success) {
        showNotification('Restaurante eliminado exitosamente', 'success');
        loadRestaurants();
      }
    } catch (error) {
      showNotification('Error al eliminar restaurante: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // =================== RENDERIZADO DE PESTAÑAS ===================
  const renderStatsTab = () => {
    if (loading || !stats) {
      return <div className="text-center py-12">Cargando estadísticas...</div>;
    }

    return (
      <div className="space-y-6">
        {/* Tarjetas de estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Usuarios</p>
                <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
              </div>
              <UserGroupIcon className="w-12 h-12 text-blue-100 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Restaurantes</p>
                <p className="text-3xl font-bold mt-2">{stats.totalRestaurants}</p>
              </div>
              <BuildingStorefrontIcon className="w-12 h-12 text-green-100 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Restaurantes Activos</p>
                <p className="text-3xl font-bold mt-2">{stats.activeRestaurants}</p>
              </div>
              <CheckIcon className="w-12 h-12 text-purple-100 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Usuarios Recientes (30d)</p>
                <p className="text-3xl font-bold mt-2">{stats.recentUsers}</p>
              </div>
              <ArrowPathIcon className="w-12 h-12 text-amber-100 opacity-80" />
            </div>
          </div>
        </div>

        {/* Gráficos de distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usuarios por rol */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Usuarios por Rol</h3>
            <div className="space-y-3">
              {stats.usersByRole && stats.usersByRole.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{item._id}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(item.count / stats.totalUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-900 font-semibold min-w-[3rem] text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Restaurantes por plan */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Restaurantes por Plan</h3>
            <div className="space-y-3">
              {stats.restaurantsByPlan && stats.restaurantsByPlan.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{item._id || 'Sin plan'}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(item.count / stats.totalRestaurants) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-900 font-semibold min-w-[3rem] text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsersTab = () => {
    return (
      <div className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={usersFilter.role}
              onChange={(e) => setUsersFilter({ ...usersFilter, role: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="owner">Propietario</option>
              <option value="employee">Empleado</option>
            </select>
            <button
              onClick={() => {
                setShowUserModal(true);
                setEditingUser(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {user.restaurant?.name || 'Sin restaurante'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{user.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {usersTotalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                  disabled={usersPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página {usersPage} de {usersTotalPages}
                </span>
                <button
                  onClick={() => setUsersPage(Math.min(usersTotalPages, usersPage + 1))}
                  disabled={usersPage === usersTotalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRestaurantsTab = () => {
    return (
      <div className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o dirección..."
                value={restaurantsSearch}
                onChange={(e) => setRestaurantsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={restaurantsFilter.isActive}
              onChange={(e) => setRestaurantsFilter({ ...restaurantsFilter, isActive: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <button
              onClick={() => {
                setShowRestaurantModal(true);
                setEditingRestaurant(null);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nuevo Restaurante
            </button>
          </div>
        </div>

        {/* Tabla de restaurantes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Cargando restaurantes...
                    </td>
                  </tr>
                ) : restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron restaurantes
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => (
                    <tr key={restaurant._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{restaurant.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {restaurant.currentSubscription?.plan || 'Sin suscripción'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {restaurant.owner?.userName || 'Sin propietario'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {restaurant.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingRestaurant(restaurant);
                            setShowRestaurantModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(restaurant._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {restaurantsTotalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setRestaurantsPage(Math.max(1, restaurantsPage - 1))}
                  disabled={restaurantsPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página {restaurantsPage} de {restaurantsTotalPages}
                </span>
                <button
                  onClick={() => setRestaurantsPage(Math.min(restaurantsTotalPages, restaurantsPage + 1))}
                  disabled={restaurantsPage === restaurantsTotalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSubscriptionsTab = () => {
    return (
      <div className="space-y-6">
        {/* Estadísticas de suscripciones */}
        {subscriptionStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">Suscripciones Activas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{subscriptionStats.activeSubscriptions || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">Suscripciones Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{subscriptionStats.pendingSubscriptions || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">Ingresos del Mes</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                ${subscriptionStats.monthlyRevenue?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        )}

        {/* Lista de suscripciones */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Todas las Suscripciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Cargando suscripciones...
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron suscripciones
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {sub.restaurant?.name || 'Sin restaurante'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sub.status === 'active' ? 'bg-green-100 text-green-800' :
                          sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          sub.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(sub.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${sub.price?.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Panel de Super Administrador
          </h1>
          <p className="text-gray-600">
            Gestiona usuarios, restaurantes y suscripciones del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <UserGroupIcon className="w-5 h-5" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('restaurants')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'restaurants'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BuildingStorefrontIcon className="w-5 h-5" />
              Restaurantes
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'subscriptions'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCardIcon className="w-5 h-5" />
              Suscripciones
            </button>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="mt-6">
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'restaurants' && renderRestaurantsTab()}
          {activeTab === 'subscriptions' && renderSubscriptionsTab()}
        </div>
      </div>

      {/* Modal de Usuario */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          restaurants={restaurants}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={editingUser ? handleUpdateUser : handleCreateUser}
        />
      )}

      {/* Modal de Restaurante */}
      {showRestaurantModal && (
        <RestaurantModal
          restaurant={editingRestaurant}
          onClose={() => {
            setShowRestaurantModal(false);
            setEditingRestaurant(null);
          }}
          onSave={editingRestaurant ? handleUpdateRestaurant : handleCreateRestaurant}
        />
      )}

      {/* Notificación toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-fade-in ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =================== COMPONENTE MODAL DE USUARIO ===================
const UserModal = ({ user, restaurants, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    userName: user?.userName || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    restaurant: user?.restaurant?._id || '',
    phone: user?.phone || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (!dataToSend.password) delete dataToSend.password;
    
    if (user) {
      onSave(user._id, dataToSend);
    } else {
      onSave(dataToSend);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña {user && '(dejar en blanco para no cambiar)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...(!user && { required: true })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="employee">Empleado</option>
              <option value="owner">Propietario</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restaurante</label>
            <select
              value={formData.restaurant}
              onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar restaurante</option>
              {restaurants.map((rest) => (
                <option key={rest._id} value={rest._id}>
                  {rest.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {user ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== COMPONENTE MODAL DE RESTAURANTE ===================
const RestaurantModal = ({ restaurant, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    address: restaurant?.address || '',
    isActive: restaurant?.isActive !== undefined ? restaurant.isActive : true,
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (restaurant) {
      // Solo actualizar restaurante
      onSave(restaurant._id, {
        name: formData.name,
        address: formData.address,
        isActive: formData.isActive,
      });
    } else {
      // Crear restaurante con propietario
      onSave({
        restaurantName: formData.name,
        address: formData.address,
        isActive: formData.isActive,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword,
        ownerPhone: formData.ownerPhone,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {restaurant ? 'Editar Restaurante' : 'Nuevo Restaurante'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
              Restaurante Activo
            </label>
          </div>

          {!restaurant && (
            <>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Propietario</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Propietario</label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del Propietario</label>
                <input
                  type="email"
                  required
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del Propietario</label>
                <input
                  type="password"
                  required
                  value={formData.ownerPassword}
                  onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del Propietario</label>
                <input
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {restaurant ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
