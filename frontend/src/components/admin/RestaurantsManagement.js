import React, { useState, useEffect } from 'react';
import { getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from '../../services/api/adminApi';
import RestaurantModal from './RestaurantModal';
import '../../styles/admin/restaurantsManagement.css';

const RestaurantsManagement = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        subscriptionPlan: 'all',
        isActive: 'all'
    });

    useEffect(() => {
        loadRestaurants();
    }, [currentPage, filters]);

    const loadRestaurants = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: 10,
                ...filters
            };
            
            const response = await getAllRestaurants(params);
            setRestaurants(response.restaurants);
            setTotalPages(response.totalPages);
        } catch (err) {
            setError('Error al cargar restaurantes');
            console.error('Error loading restaurants:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRestaurant = async (restaurantData) => {
        try {
            await createRestaurant(restaurantData);
            setSuccess('Restaurante creado exitosamente');
            setShowModal(false);
            loadRestaurants();
        } catch (err) {
            setError(err.message || 'Error al crear restaurante');
        }
    };

    const handleUpdateRestaurant = async (restaurantData) => {
        try {
            await updateRestaurant(editingRestaurant._id, restaurantData);
            setSuccess('Restaurante actualizado exitosamente');
            setShowModal(false);
            setEditingRestaurant(null);
            loadRestaurants();
        } catch (err) {
            setError(err.message || 'Error al actualizar restaurante');
        }
    };

    const handleDeleteRestaurant = async (restaurantId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este restaurante? Esta acción también eliminará todos los usuarios asociados.')) {
            return;
        }

        try {
            await deleteRestaurant(restaurantId);
            setSuccess('Restaurante eliminado exitosamente');
            loadRestaurants();
        } catch (err) {
            setError(err.message || 'Error al eliminar restaurante');
        }
    };

    const handleEditRestaurant = (restaurant) => {
        setEditingRestaurant(restaurant);
        setShowModal(true);
    };

    const handleToggleStatus = async (restaurant) => {
        try {
            await updateRestaurant(restaurant._id, {
                isActive: !restaurant.isActive
            });
            setSuccess(`Restaurante ${restaurant.isActive ? 'desactivado' : 'activado'} exitosamente`);
            loadRestaurants();
        } catch (err) {
            setError(err.message || 'Error al cambiar estado del restaurante');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const getPlanLabel = (plan) => {
        switch (plan) {
            case 'Basic': return '🥉 Básico';
            case 'Premium': return '🥈 Premium';
            case 'Enterprise': return '🥇 Enterprise';
            default: return plan;
        }
    };

    const getStatusLabel = (isActive) => {
        return isActive ? '✅ Activo' : '❌ Inactivo';
    };

    return (
        <div className="restaurants-management">
            <div className="restaurants-header">
                <h2>🏪 Gestión de Restaurantes</h2>
                <button 
                    className="create-btn"
                    onClick={() => setShowModal(true)}
                >
                    ➕ Crear Restaurante
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>⚠️ {error}</span>
                    <button onClick={clearMessages}>✕</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <span>✅ {success}</span>
                    <button onClick={clearMessages}>✕</button>
                </div>
            )}

            <div className="filters-section">
                <div className="filter-group">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por nombre o dirección..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-group">
                    <select
                        value={filters.subscriptionPlan}
                        onChange={(e) => handleFilterChange('subscriptionPlan', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Todos los planes</option>
                        <option value="Basic">Básico</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        value={filters.isActive}
                        onChange={(e) => handleFilterChange('isActive', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Cargando restaurantes...</p>
                </div>
            ) : (
                <>
                    <div className="restaurants-table-container">
                        <table className="restaurants-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Dirección</th>
                                    <th>Propietario</th>
                                    <th>Plan</th>
                                    <th>Estado</th>
                                    <th>Fecha Creación</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {restaurants.map(restaurant => (
                                    <tr key={restaurant._id} className={!restaurant.isActive ? 'inactive' : ''}>
                                        <td className="restaurant-name">
                                            <strong>{restaurant.name}</strong>
                                        </td>
                                        <td className="restaurant-address">
                                            {restaurant.address}
                                        </td>
                                        <td className="restaurant-owner">
                                            {restaurant.owner ? (
                                                <div>
                                                    <div>{restaurant.owner.userName}</div>
                                                    <small>{restaurant.owner.email}</small>
                                                </div>
                                            ) : (
                                                <span className="no-owner">Sin propietario</span>
                                            )}
                                        </td>
                                        <td className="restaurant-plan">
                                            {getPlanLabel(restaurant.subscriptionPlan)}
                                        </td>
                                        <td className="restaurant-status">
                                            <span className={`status-badge ${restaurant.isActive ? 'active' : 'inactive'}`}>
                                                {getStatusLabel(restaurant.isActive)}
                                            </span>
                                        </td>
                                        <td className="restaurant-date">
                                            {new Date(restaurant.createdAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="restaurant-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditRestaurant(restaurant)}
                                                title="Editar restaurante"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className={`toggle-btn ${restaurant.isActive ? 'deactivate' : 'activate'}`}
                                                onClick={() => handleToggleStatus(restaurant)}
                                                title={restaurant.isActive ? 'Desactivar' : 'Activar'}
                                            >
                                                {restaurant.isActive ? '🔴' : '🟢'}
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteRestaurant(restaurant._id)}
                                                title="Eliminar restaurante"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="pagination-btn"
                        >
                            ⬅️ Anterior
                        </button>
                        
                        <span className="pagination-info">
                            Página {currentPage} de {totalPages}
                        </span>
                        
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="pagination-btn"
                        >
                            Siguiente ➡️
                        </button>
                    </div>
                </>
            )}

            {showModal && (
                <RestaurantModal
                    restaurant={editingRestaurant}
                    onSave={editingRestaurant ? handleUpdateRestaurant : handleCreateRestaurant}
                    onCancel={() => {
                        setShowModal(false);
                        setEditingRestaurant(null);
                    }}
                />
            )}
        </div>
    );
};

export default RestaurantsManagement;
