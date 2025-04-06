import React, { useState } from 'react';
import axios from 'axios';
import '../../styles/login.css'; // Importa el archivo CSS
import useAuthStore from '../../store/useAuthStore'; // Asegúrate de implementar este store

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setAuthToken } = useAuthStore(); // Función para guardar el token en el estado global

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Limpiar errores previos
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
            // Redirigir al usuario a otra página, por ejemplo, el dashboard
            window.location.href = '/mostrador';
        } catch (err) {
            console.error(err);
            setError('Invalid email or password');
        }
    };

    return (
        <div className="login-container">
            <h2>Login</h2>
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
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;