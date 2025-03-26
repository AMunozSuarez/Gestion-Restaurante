import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/header.css';

const Header = () => {
    return (
        <header className="header">
            <nav className="nav">
                <ul className="nav-list">
                    <li className="nav-item">
                        <Link to="/">Login</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/principal">Inicio</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/admin/productos">Productos</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/admin/categorias">Categorías</Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;