import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/subHeader.css'; // Estilos específicos del subheader

const SubHeader = () => {
    return (
        <div className="sub-header">
            <NavLink
                to="/mostrador"
                className={({ isActive }) => (isActive ? 'active' : '')}
            >
                Mostrador
            </NavLink>
            <NavLink
                to="/delivery"
                className={({ isActive }) => (isActive ? 'active' : '')}
            >
                Delivery
            </NavLink>
        </div>
    );
};

export default SubHeader;