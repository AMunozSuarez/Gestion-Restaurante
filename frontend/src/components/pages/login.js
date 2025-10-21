import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../../styles/login.css'; // Importa el archivo CSS
import useAuthStore from '../../store/useAuthStore'; // Asegúrate de implementar este store
import useAuth from '../../hooks/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuthToken } = useAuthStore(); // Función para guardar el token en el estado global
    const { isAuthenticated } = useAuth(); // Hook para verificar autenticación
    const navigate = useNavigate(); // Hook para navegación programática
    const location = useLocation(); // Hook para obtener la ubicación actual

    // Obtener la ruta desde donde vino el usuario (si fue redirigido)
    const from = location.state?.from?.pathname || '/mostrador';

    // Redireccionar si ya está autenticado
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Limpiar errores previos
        setLoading(true); // Activar estado de carga
        
        try {
            const response = await axios.post(
                '/auth/login',
                { email, password },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const { token } = response.data; // Asegúrate de que el backend devuelva un token
            setAuthToken(token); // Guardar el token en el estado global
            localStorage.setItem('authToken', token); // Guardar el token en localStorage para persistencia
            console.log('Login successful');
            
            // Redirigir a la página desde donde vino o a mostrador por defecto
            navigate(from, { replace: true });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Email o contraseña inválidos');
        } finally {
            setLoading(false); // Desactivar estado de carga
        }
    };

    return (
        <div className="login-container">
            <h2>Iniciar Sesión</h2>
            
            {/* Mensaje si fue redirigido desde una página protegida */}
            {location.state?.from && (
                <div className="info-message">
                    <p>🔒 Debes iniciar sesión para acceder a esta página</p>
                </div>
            )}
            
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default Login;