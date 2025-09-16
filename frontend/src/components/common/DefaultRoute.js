import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const DefaultRoute = () => {
    const { isAuthenticated } = useAuth();

    // Si está autenticado, redirigir a mostrador
    // Si no está autenticado, redirigir a login
    return <Navigate to={isAuthenticated ? "/mostrador" : "/login"} replace />;
};

export default DefaultRoute;
