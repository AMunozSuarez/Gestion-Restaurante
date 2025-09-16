import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser, getAllRestaurants } from '../../services/api/adminApi';
import UserModal from './UserModal';
import '../../styles/admin/usersManagement.css';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        role: 'all',
        restaurant: 'all'
    });

    useEffect(() => {
        loadUsers();
        loadRestaurants();
    }, [currentPage, filters]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: 10,
                ...filters
            };
            
            const response = await getAllUsers(params);
            setUsers(response.users);
            setTotalPages(response.totalPages);
        } catch (err) {
            setError('Error al cargar usuarios');
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRestaurants = async () => {
        try {
            const response = await getAllRestaurants({ limit: 100 });
            setRestaurants(response.restaurants);
        } catch (err) {
            console.error('Error loading restaurants:', err);
        }
    };

    const handleCreateUser = async (userData) => {
        try {
            await createUser(userData);
            setSuccess('Usuario creado exitosamente');
            setShowModal(false);
            loadUsers();
        } catch (err) {
            setError(err.message || 'Error al crear usuario');
        }
    };

    const handleUpdateUser = async (userData) => {
        try {
            await updateUser(editingUser._id, userData);
            setSuccess('Usuario actualizado exitosamente');
            setShowModal(false);
            setEditingUser(null);
            loadUsers();
        } catch (err) {
            setError(err.message || 'Error al actualizar usuario');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }

        try {
            await deleteUser(userId);
            setSuccess('Usuario eliminado exitosamente');
            loadUsers();
        } catch (err) {
            setError(err.message || 'Error al eliminar usuario');
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'super_admin': return '🔧 Super Admin';
            case 'owner': return '👑 Propietario';
            case 'employee': return '👤 Empleado';
            default: return role;
        }
    };

    return (
        <div className="users-management">
            <div className="users-header">
                <h2>👥 Gestión de Usuarios</h2>
                <button 
                    className="create-btn"
                    onClick={() => setShowModal(true)}
                >
                    ➕ Crear Usuario
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
                        placeholder="🔍 Buscar por nombre o email..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="filter-group">
                    <select
                        value={filters.role}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Todos los roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="owner">Propietarios</option>
                        <option value="employee">Empleados</option>
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        value={filters.restaurant}
                        onChange={(e) => handleFilterChange('restaurant', e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Todos los restaurantes</option>
                        {restaurants.map(restaurant => (
                            <option key={restaurant._id} value={restaurant._id}>
                                {restaurant.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Cargando usuarios...</p>
                </div>
            ) : (
                <>
                    <div className="users-table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Avatar</th>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Restaurante</th>
                                    <th>Teléfono</th>
                                    <th>Fecha Registro</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <img 
                                                src={user.avatar} 
                                                alt="Avatar" 
                                                className="user-avatar"
                                                onError={(e) => {
                                                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png';
                                                }}
                                            />
                                        </td>
                                        <td className="user-name">{user.userName}</td>
                                        <td className="user-email">{user.email}</td>
                                        <td className="user-role">{getRoleLabel(user.role)}</td>
                                        <td className="user-restaurant">
                                            {user.restaurant?.name || 'Sin asignar'}
                                        </td>
                                        <td className="user-phone">{user.phone || 'No especificado'}</td>
                                        <td className="user-date">
                                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="user-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditUser(user)}
                                                title="Editar usuario"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteUser(user._id)}
                                                title="Eliminar usuario"
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
                <UserModal
                    user={editingUser}
                    restaurants={restaurants}
                    onSave={editingUser ? handleUpdateUser : handleCreateUser}
                    onCancel={() => {
                        setShowModal(false);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
};

export default UsersManagement;
