import React, { useState, useEffect } from 'react';
import '../../styles/admin/userModal.css';

const UserModal = ({ user, restaurants, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        userName: '',
        email: '',
        password: '',
        role: 'employee',
        restaurant: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                userName: user.userName || '',
                email: user.email || '',
                password: '', // No mostrar password existente
                role: user.role || 'employee',
                restaurant: user.restaurant?._id || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.userName.trim()) {
            newErrors.userName = 'El nombre de usuario es obligatorio';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es obligatorio';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'El email no es válido';
        }

        if (!user && !formData.password) {
            newErrors.password = 'La contraseña es obligatoria para usuarios nuevos';
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (!formData.role) {
            newErrors.role = 'El rol es obligatorio';
        }

        if (!formData.restaurant) {
            newErrors.restaurant = 'El restaurante es obligatorio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const submitData = { ...formData };
            
            // Si estamos editando y no hay nueva password, no incluirla
            if (user && !formData.password) {
                delete submitData.password;
            }

            await onSave(submitData);
        } catch (error) {
            console.error('Error saving user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h3>
                        {user ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}
                    </h3>
                    <button 
                        className="close-btn"
                        onClick={onCancel}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="user-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="userName">
                                👤 Nombre de Usuario *
                            </label>
                            <input
                                type="text"
                                id="userName"
                                name="userName"
                                value={formData.userName}
                                onChange={handleChange}
                                className={errors.userName ? 'error' : ''}
                                placeholder="Ingresa el nombre de usuario"
                            />
                            {errors.userName && (
                                <span className="error-text">{errors.userName}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                📧 Email *
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? 'error' : ''}
                                placeholder="usuario@ejemplo.com"
                            />
                            {errors.email && (
                                <span className="error-text">{errors.email}</span>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password">
                                🔒 Contraseña {!user && '*'}
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={errors.password ? 'error' : ''}
                                placeholder={user ? "Dejar vacío para mantener actual" : "Mínimo 6 caracteres"}
                            />
                            {errors.password && (
                                <span className="error-text">{errors.password}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                📱 Teléfono
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Número de teléfono"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="role">
                                🎭 Rol *
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={errors.role ? 'error' : ''}
                            >
                                <option value="employee">👤 Empleado</option>
                                <option value="owner">👑 Propietario</option>
                                <option value="super_admin">🔧 Super Admin</option>
                            </select>
                            {errors.role && (
                                <span className="error-text">{errors.role}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="restaurant">
                                🏪 Restaurante *
                            </label>
                            <select
                                id="restaurant"
                                name="restaurant"
                                value={formData.restaurant}
                                onChange={handleChange}
                                className={errors.restaurant ? 'error' : ''}
                            >
                                <option value="">Seleccionar restaurante</option>
                                {restaurants.map(restaurant => (
                                    <option key={restaurant._id} value={restaurant._id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                            {errors.restaurant && (
                                <span className="error-text">{errors.restaurant}</span>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cancel-btn"
                            disabled={loading}
                        >
                            ❌ Cancelar
                        </button>
                        <button
                            type="submit"
                            className="save-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner small"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    ✅ {user ? 'Actualizar' : 'Crear'} Usuario
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
