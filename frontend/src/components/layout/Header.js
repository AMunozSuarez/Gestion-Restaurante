import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/components/header.css';
import useAuth from '../../hooks/useAuth'; // Importa el hook de autenticación

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
                                <NavLink to="/delivery" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    Delivery
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
