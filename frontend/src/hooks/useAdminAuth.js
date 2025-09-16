import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import { jwtDecode } from 'jwt-decode';

const useAdminAuth = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const { authToken: token } = useAuthStore();

    useEffect(() => {
        checkAdminPermissions();
    }, [token]);

    const checkAdminPermissions = async () => {
        try {
            setLoading(true);
            
            if (!token) {
                console.log('🔐 No hay token disponible');
                setIsAdmin(false);
                setUserRole(null);
                return;
            }

            // Decodificar el token JWT para obtener información del usuario
            const decodedToken = jwtDecode(token);
            console.log('🔍 Token decodificado:', decodedToken);
            
            const currentTime = Date.now() / 1000;

            // Verificar si el token ha expirado
            if (decodedToken.exp < currentTime) {
                console.log('⏰ Token expirado');
                setIsAdmin(false);
                setUserRole(null);
                return;
            }

            // Verificar el rol del usuario
            const role = decodedToken.role || decodedToken.userRole;
            console.log('👤 Rol del usuario:', role);
            setUserRole(role);
            
            // Solo los super_admin tienen acceso al panel de administración
            if (role === 'super_admin') {
                console.log('✅ Usuario es super_admin, acceso permitido');
                setIsAdmin(true);
            } else {
                console.log('❌ Usuario no es super_admin, acceso denegado');
                setIsAdmin(false);
            }

        } catch (error) {
            console.error('❌ Error verificando permisos de administrador:', error);
            setIsAdmin(false);
            setUserRole(null);
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (requiredRole) => {
        if (!userRole) return false;
        
        // Jerarquía de roles
        const roleHierarchy = {
            'super_admin': 3,
            'owner': 2,
            'employee': 1
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    };

    const canAccessAdminPanel = () => {
        return userRole === 'super_admin';
    };

    const canManageRestaurant = () => {
        return hasPermission('owner');
    };

    const canManageOrders = () => {
        return hasPermission('employee');
    };

    return {
        isAdmin,
        loading,
        userRole,
        hasPermission,
        canAccessAdminPanel,
        canManageRestaurant,
        canManageOrders,
        checkAdminPermissions
    };
};

export default useAdminAuth;
