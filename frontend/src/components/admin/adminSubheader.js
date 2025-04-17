import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/admin/adminSubheader.css'; // Estilos específicos para el subheader

const AdminSubheader = () => {
    return (
        <div className="admin-subheader">
            <NavLink to="/admin/caja" activeClassName="active-link">
                Caja
            </NavLink>
            <NavLink to="/admin/sales" activeClassName="active-link">
                Ventas
            </NavLink>
            <NavLink to="/admin/orders" activeClassName="active-link">
                Pedidos
            </NavLink>
            <NavLink to="/admin/products" activeClassName="active-link">
                Productos
            </NavLink>
        </div>
    );
};

export default AdminSubheader;