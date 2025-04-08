import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/header.css';
import useAuth from '../hooks/useAuth'; // Importa el hook de autenticación

const Header = () => {
    const { isAuthenticated, logout } = useAuth(); // Obtén el estado de autenticación y la función logout

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
                            <li className="nav-item">
                                <NavLink to="/admin/reportes" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Reportes
                                </NavLink>
                            </li>
                            <li className="nav-item logout-item">
                                <button className="logout-button" onClick={logout}>
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