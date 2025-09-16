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
                setIsAdmin(false);
                setUserRole(null);
                return;
            }

            // Decodificar el token JWT para obtener información del usuario
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            // Verificar si el token ha expirado
            if (decodedToken.exp < currentTime) {
                setIsAdmin(false);
                setUserRole(null);
                return;
            }

            // Verificar el rol del usuario
            const role = decodedToken.role || decodedToken.userRole;
            setUserRole(role);
            
            // Solo los super_admin tienen acceso al panel de administración
            if (role === 'super_admin') {
                setIsAdmin(true);
            } else {
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
