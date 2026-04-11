import axios from 'axios';
import { getSocketId } from './socketService';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token y socketId a las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const socketId = getSocketId();
    if (socketId) {
      config.headers['X-Socket-Id'] = socketId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');
      const isRegisterRequest = requestUrl.includes('/auth/register');

      // Si el 401 viene del propio login/register, no forzar recarga/redirección.
      if (isLoginRequest || isRegisterRequest) {
        return Promise.reject(error);
      }

      // Token expirado o inválido en rutas protegidas
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Evitar recargar innecesariamente si ya estamos en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;