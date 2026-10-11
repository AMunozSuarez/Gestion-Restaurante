import axios from 'axios';

// Manejo de la sesión compartido por api.js (HTTP) y socketService.js (socket).
// Vive aparte para que esos dos módulos no se importen entre sí.

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const clearSessionAndRedirect = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Una sola llamada a /auth/refresh en vuelo: si HTTP y socket piden renovar a la
// vez, comparten la misma promesa en vez de gastar el refresh token dos veces.
let refreshPromise = null;

export const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return Promise.reject(new Error('No hay refresh token'));
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      localStorage.setItem('token', data.token);
      return data.token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// true si el servidor rechazó el refresh (sesión cerrada/revocada); false si fue
// un problema de red, en cuyo caso conviene reintentar más tarde sin cerrar sesión.
export const isRefreshRejected = (error) => Boolean(error?.response) || error?.message === 'No hay refresh token';
