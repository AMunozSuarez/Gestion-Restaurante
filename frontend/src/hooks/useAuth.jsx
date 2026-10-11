import { useState, useEffect, createContext, useContext } from 'react';
import authService from '../services/authService';
import { disconnectSocket } from '../services/socketService';
import { isRefreshRejected, refreshAccessToken } from '../services/authSession';
import printingService from '../services/printingService';

// Crear contexto de autenticación
const AuthContext = createContext();

// Provider de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    const restoreSession = (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(true);
      printingService.syncRestaurantSettingsFromBackend().catch((error) => {
        console.error('No se pudo sincronizar configuración compartida al restaurar sesión:', error);
      });
    };

    const checkAuth = async () => {
      try {
        // Usar verificación local en lugar de llamada al servidor
        const currentUser = authService.getCurrentUser();
        if (authService.isAuthenticated()) {
          restoreSession(currentUser);
        } else if (currentUser && localStorage.getItem('refreshToken')) {
          // JWT vencido pero con refresh token: renovar en vez de pedir login otra vez.
          // Las pantallas fijas (KDS, pantalla de cliente) dependen de esto para no
          // quedar en el login cada 7 días.
          try {
            await refreshAccessToken();
            restoreSession(currentUser);
          } catch (error) {
            if (isRefreshRejected(error)) {
              authService.logout();
              printingService.clearRestaurantSettingsCache();
              setUser(null);
              setIsAuthenticated(false);
            } else {
              // Sin red al arrancar: se mantiene la sesión; el socket y api.js
              // renuevan el token apenas vuelva la conexión.
              restoreSession(currentUser);
            }
          }
        } else {
          // Token expirado o no existe, limpiar
          authService.logout();
          printingService.clearRestaurantSettingsCache();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Token inválido, limpiar
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Función de login
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const { user: userData } = await authService.login(credentials);
      setUser(userData);
      setIsAuthenticated(true);
      printingService.syncRestaurantSettingsFromBackend(true).catch((error) => {
        console.error('No se pudo sincronizar configuración compartida después del login:', error);
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    authService.logout();
    disconnectSocket();
    printingService.clearRestaurantSettingsCache();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};