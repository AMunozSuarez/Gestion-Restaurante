import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SubHeader from './subHeader'; // Importar el subheader
import '../../styles/mostrador.css'; // Estilos del mostrador
import '../../styles/deliveryDetails.css'; // Estilos de delivery

const MostradorLayout = () => {
    const location = useLocation(); // Obtener la ruta actual

    // Determinar la clase del contenedor y del botón según la ruta actual
    const containerClass = location.pathname.startsWith('/mostrador')
        ? 'mostrador-container'
        : 'delivery-container';

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