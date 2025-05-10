import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/admin/adminSubheader.css'; // Estilos específicos para el subheader

const AdminSubheader = () => {
    return (
        <div className="admin-subheader">
            <NavLink to="/admin/caja" className={({ isActive }) => (isActive ? 'active' : '')}>
                Caja
            </NavLink>
            <NavLink to="/admin/sales" className={({ isActive }) => (isActive ? 'active' : '')}>
                Ventas
            </NavLink>
            <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
                Pedidos
            </NavLink>
            <NavLink to="/admin/products" className={({ isActive }) => (isActive ? 'active' : '')}>
                Productos
            </NavLink>
        </div>
    );
};

export default AdminSubheader;