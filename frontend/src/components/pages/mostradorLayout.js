import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import SubHeader from './subHeader'; // Importar el subheader
import '../../styles/mostrador.css'; // Estilos del mostrador

const MostradorLayout = () => {
    const navigate = useNavigate();

    const handleCreateNewOrder = () => {
        navigate('/mostrador'); // Navegar al estado inicial de creación
    };

    return (
        <div className="mostrador-layout">
            {/* Subheader */}
            <SubHeader />

            {/* Botón para crear un nuevo pedido */}
            <div className="create-order-button-container">
                <button className="create-order-button" onClick={handleCreateNewOrder}>
                    Crear Pedido +
                </button>
            </div>

            {/* Renderizar las rutas derivadas */}
            <Outlet />
        </div>
    );
};

export default MostradorLayout;