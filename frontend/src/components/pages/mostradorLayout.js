import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SubHeader from './subHeader'; // Importar el subheader
import '../../styles/mostrador.css'; // Estilos del mostrador
import '../../styles/deliveryDetails.css'; // Estilos de delivery

const MostradorLayout = () => {
    const navigate = useNavigate();
    const location = useLocation(); // Obtener la ruta actual

    const handleCreateNewOrder = () => {
        if (location.pathname.startsWith('/mostrador')) {
            navigate('/mostrador'); // Navegar al estado inicial de creación en mostrador
        } else if (location.pathname.startsWith('/delivery')) {
            navigate('/delivery'); // Navegar al estado inicial de creación en delivery
        }
    };

    // Determinar la clase del contenedor y del botón según la ruta actual
    const containerClass = location.pathname.startsWith('/mostrador')
        ? 'mostrador-container'
        : 'delivery-container';

    const buttonClass = location.pathname.startsWith('/mostrador')
        ? 'create-order-button-mostrador'
        : 'create-order-button-delivery';

    return (
        <>
            {/* Subheader sin clases específicas */}
            <SubHeader />

            {/* Contenedor principal con clases dinámicas */}
            <div className={containerClass}>
                {/* Renderizar las rutas derivadas */}
                <Outlet />
            </div>
        </>
    );
};

export default MostradorLayout;