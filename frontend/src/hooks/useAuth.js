import { useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';

const useAuth = () => {
    const { authToken, setAuthToken, clearAuthToken } = useAuthStore();

    // Sincronizar el estado con localStorage al cargar la aplicación
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            setAuthToken(token); // Actualiza el estado global con el token
        }
    }, [setAuthToken]);

    const isAuthenticated = !!authToken;

    const logout = () => {
        clearAuthToken();
        localStorage.removeItem('authToken');
        window.location.href = '/login'; // Redirige al login
    };

    return { isAuthenticated, authToken, logout };
};

export default useAuth;