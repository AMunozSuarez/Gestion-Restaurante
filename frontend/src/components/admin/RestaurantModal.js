import React, { useState, useEffect } from 'react';
import '../../styles/admin/restaurantModal.css';

const RestaurantModal = ({ restaurant, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        // Datos del restaurante
        restaurantName: '',
        address: '',
        subscriptionPlan: 'Basic',
        
        // Datos del propietario (solo para crear)
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerPhone: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (restaurant) {
            setIsEditMode(true);
            setFormData({
                restaurantName: restaurant.name || '',
                address: restaurant.address || '',
                subscriptionPlan: restaurant.subscriptionPlan || 'Basic',
                
                // En modo edición no mostramos datos del propietario
                ownerName: '',
                ownerEmail: '',
                ownerPassword: '',
                ownerPhone: ''
            });
        } else {
            setIsEditMode(false);
        }
    }, [restaurant]);

    const validateForm = () => {
        const newErrors = {};

        // Validación del restaurante
        if (!formData.restaurantName.trim()) {
            newErrors.restaurantName = 'El nombre del restaurante es obligatorio';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'La dirección es obligatoria';
        }

        if (!formData.subscriptionPlan) {
            newErrors.subscriptionPlan = 'El plan de suscripción es obligatorio';
        }

        // Validación del propietario (solo en modo crear)
        if (!isEditMode) {
            if (!formData.ownerName.trim()) {
                newErrors.ownerName = 'El nombre del propietario es obligatorio';
            }

            if (!formData.ownerEmail.trim()) {
                newErrors.ownerEmail = 'El email del propietario es obligatorio';
            } else if (!/\S+@\S+\.\S+/.test(formData.ownerEmail)) {
                newErrors.ownerEmail = 'El email no es válido';
            }

            if (!formData.ownerPassword) {
                newErrors.ownerPassword = 'La contraseña del propietario es obligatoria';
            } else if (formData.ownerPassword.length < 6) {
                newErrors.ownerPassword = 'La contraseña debe tener al menos 6 caracteres';
            }
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
            if (isEditMode) {
                // Solo enviar datos del restaurante en modo edición
                const submitData = {
                    name: formData.restaurantName,
                    address: formData.address,
                    subscriptionPlan: formData.subscriptionPlan
                };
                await onSave(submitData);
            } else {
                // Enviar todos los datos en modo crear
                await onSave(formData);
            }
        } catch (error) {
            console.error('Error saving restaurant:', error);
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
            <div className="modal-container restaurant-modal">
                <div className="modal-header">
                    <h3>
                        {isEditMode ? '✏️ Editar Restaurante' : '➕ Crear Nuevo Restaurante'}
                    </h3>
                    <button 
                        className="close-btn"
                        onClick={onCancel}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="restaurant-form">
                    <div className="form-section">
                        <h4>🏪 Información del Restaurante</h4>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="restaurantName">
                                    🏢 Nombre del Restaurante *
                                </label>
                                <input
                                    type="text"
                                    id="restaurantName"
                                    name="restaurantName"
                                    value={formData.restaurantName}
                                    onChange={handleChange}
                                    className={errors.restaurantName ? 'error' : ''}
                                    placeholder="Nombre del restaurante"
                                />
                                {errors.restaurantName && (
                                    <span className="error-text">{errors.restaurantName}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="subscriptionPlan">
                                    💼 Plan de Suscripción *
                                </label>
                                <select
                                    id="subscriptionPlan"
                                    name="subscriptionPlan"
                                    value={formData.subscriptionPlan}
                                    onChange={handleChange}
                                    className={errors.subscriptionPlan ? 'error' : ''}
                                >
                                    <option value="Basic">🥉 Básico</option>
                                    <option value="Premium">🥈 Premium</option>
                                    <option value="Enterprise">🥇 Enterprise</option>
                                </select>
                                {errors.subscriptionPlan && (
                                    <span className="error-text">{errors.subscriptionPlan}</span>
                                )}
                            </div>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="address">
                                📍 Dirección *
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className={errors.address ? 'error' : ''}
                                placeholder="Dirección completa del restaurante"
                            />
                            {errors.address && (
                                <span className="error-text">{errors.address}</span>
                            )}
                        </div>
                    </div>

                    {!isEditMode && (
                        <div className="form-section">
                            <h4>👑 Información del Propietario</h4>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="ownerName">
                                        👤 Nombre del Propietario *
                                    </label>
                                    <input
                                        type="text"
                                        id="ownerName"
                                        name="ownerName"
                                        value={formData.ownerName}
                                        onChange={handleChange}
                                        className={errors.ownerName ? 'error' : ''}
                                        placeholder="Nombre completo del propietario"
                                    />
                                    {errors.ownerName && (
                                        <span className="error-text">{errors.ownerName}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="ownerEmail">
                                        📧 Email del Propietario *
                                    </label>
                                    <input
                                        type="email"
                                        id="ownerEmail"
                                        name="ownerEmail"
                                        value={formData.ownerEmail}
                                        onChange={handleChange}
                                        className={errors.ownerEmail ? 'error' : ''}
                                        placeholder="propietario@ejemplo.com"
                                    />
                                    {errors.ownerEmail && (
                                        <span className="error-text">{errors.ownerEmail}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="ownerPassword">
                                        🔒 Contraseña del Propietario *
                                    </label>
                                    <input
                                        type="password"
                                        id="ownerPassword"
                                        name="ownerPassword"
                                        value={formData.ownerPassword}
                                        onChange={handleChange}
                                        className={errors.ownerPassword ? 'error' : ''}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    {errors.ownerPassword && (
                                        <span className="error-text">{errors.ownerPassword}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="ownerPhone">
                                        📱 Teléfono del Propietario
                                    </label>
                                    <input
                                        type="tel"
                                        id="ownerPhone"
                                        name="ownerPhone"
                                        value={formData.ownerPhone}
                                        onChange={handleChange}
                                        placeholder="Número de teléfono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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
                                    {isEditMode ? 'Actualizando...' : 'Creando...'}
                                </>
                            ) : (
                                <>
                                    ✅ {isEditMode ? 'Actualizar' : 'Crear'} Restaurante
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RestaurantModal;
