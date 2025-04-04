import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/header.css';

const Header = () => {
    return (
        <header className="header">
            <nav className="nav">
                <ul className="nav-list">
                    <li className="nav-item">
                        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
                            Login
                        </NavLink>
                    </li>
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
                </ul>
            </nav>
        </header>
    );
};

export default Header;