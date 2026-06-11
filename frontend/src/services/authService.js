import api from './api';

// Función auxiliar para decodificar JWT sin verificar
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

// Función para verificar si el token ha expirado
const isTokenExpired = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

export const authService = {
  // Login
  login: async (credentials) => {
    try {
      const normalizedEmail = (credentials?.email || '').trim().toLowerCase();
      const response = await api.post('/auth/login', {
        ...credentials,
        email: normalizedEmail
      });
      const { token, refreshToken, message } = response.data;

      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

      const decoded = decodeJWT(token);
      const user = {
        id: decoded.id,
        email: normalizedEmail,
        role: decoded.role,
        restaurant: decoded.restaurant
      };
      localStorage.setItem('user', JSON.stringify(user));

      return { token, user };
    } catch (error) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (serverMessage) {
        throw new Error(serverMessage);
      }

      if (!error.response) {
        throw new Error('No fue posible conectarse al servidor. Revisa tu conexión e inténtalo nuevamente.');
      }

      if (status === 404) {
        throw new Error('No existe una cuenta asociada a ese correo electrónico.');
      }

      if (status === 401) {
        throw new Error('La contraseña ingresada es incorrecta.');
      }

      throw new Error('No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.');
    }
  },

  // Logout
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      // Revocar refresh token en el servidor (fire-and-forget)
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Verificar si el usuario está autenticado (verificación local)
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Verificar si el token ha expirado
    return !isTokenExpired(token);
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar token con el servidor
  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw new Error('Token inválido');
    }
  },

  // Registrar nuevo usuario (solo admin)
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', {
        ...userData,
        email: userData?.email ? userData.email.trim().toLowerCase() : userData?.email
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al registrar usuario');
    }
  }
};

export default authService;