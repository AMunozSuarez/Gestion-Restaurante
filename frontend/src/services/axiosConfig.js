import axios from 'axios';

const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL, // URL desde variables de entorno
});

// Interceptor para agregar el token a cada solicitud
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken'); // Obtén el token del localStorage
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Agrega el token al header
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores de respuesta
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('authToken'); // Elimina el token inválido
            window.location.href = '/login'; // Redirige al login
        }
        return Promise.reject(error);
    }
);

export default instance;