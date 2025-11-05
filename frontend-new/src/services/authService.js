import api from './api';

export const authService = {
  // Login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, message } = response.data;
      
      // Guardar token en localStorage
      localStorage.setItem('token', token);
      
      // Obtener información del usuario desde el token (opcional)
      // Por ahora guardaremos un objeto básico
      const user = {
        email: credentials.email,
        // Puedes decodificar el JWT para obtener más info si es necesario
      };
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Verificar si el usuario está autenticado
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar token
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
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al registrar usuario');
    }
  }
};

export default authService;