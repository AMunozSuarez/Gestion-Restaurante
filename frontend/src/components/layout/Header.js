import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/components/header.css';
import useAuth from '../../hooks/useAuth'; // Importa el hook de autenticación
import useAdminAuth from '../../hooks/useAdminAuth'; // Importa el hook de permisos de admin

const Header = () => {
    const { isAuthenticated, logout } = useAuth(); // Obtén el estado de autenticación y la función logout
    const { canAccessAdminPanel } = useAdminAuth(); // Obtén permisos de super admin

    return (
        <header className="header">
            <nav className="nav">
                <ul className="nav-list">
                    {!isAuthenticated ? (
                        <li className="nav-item">
                            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
                                Login
                            </NavLink>
                        </li>
                    ) : (
                        <>
                            <li className="nav-item">
                                <NavLink to="/mostrador" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Inicio
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/admin/productos" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Productos
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/admin/categorias" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Categorías
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/admin/caja" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Caja
                                </NavLink>
                            </li>
                            {canAccessAdminPanel() && (
                                <li className="nav-item">
                                    <NavLink 
                                        to="/super-admin" 
                                        className={({ isActive }) => (isActive ? 'active super-admin' : 'super-admin')}
                                        title="Panel de Super Administración"
                                    >
                                        🔧 Super Admin
                                    </NavLink>
                                </li>
                            )}
                            <li className="nav-item">
                                <NavLink 
                                    to="/settings" 
                                    className={({ isActive }) => (isActive ? 'active settings-link' : 'settings-link')}
                                    title="Configuración"
                                >
                                    ⚙️ Configuración
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <button onClick={logout} className="logout-button">
                                    Cerrar sesión
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
