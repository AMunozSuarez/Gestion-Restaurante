import React, { useState, useEffect } from 'react';
import '../../styles/admin/salesList.css'; // Estilos específicos para la lista de ventas
import { getSales } from '../../api/salesApi'; // API para obtener las ventas
import AdminSubheader from './adminSubheader'; // Subheader para navegación

const SalesList = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0], // Fecha actual
        status: '',
        paymentMethod: '', // Cambiar a "paymentMethod" para enviar correctamente al backend
    });

    // Obtener las ventas desde la API
    const fetchSales = async () => {
        try {
            const response = await getSales(filters);
            setSales(response.data.orders);
            setFilteredSales(response.data.orders);
        } catch (error) {
            console.error('Error al obtener las ventas:', error);
        }
    };

    // Actualizar las ventas cuando cambien los filtros
    useEffect(() => {
        fetchSales();
    }, [filters]);

    return (
        <div className="sales-list">
            <AdminSubheader /> {/* Subheader para cambiar entre páginas */}
            <h2>Listado de Ventas</h2>

            {/* Filtros */}
            <div className="filters">
                <label>
                    Fecha:
                    <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    />
                </label>
                <label>
                    Estado:
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">Todos</option>
                        <option value="Completado">Completado</option>
                        <option value="Preparacion">Preparacion</option>
                        <option value="Cancelada">Cancelada</option>
                    </select>
                </label>
                <label>
                    Método de Pago:
                    <select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                    >
                        <option value="">Todos</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Debito">Debito</option>
                        <option value="Credito">Credito</option>
                    </select>
                </label>
            </div>

            {/* Tabla de ventas */}
            <table className="sales-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Método de Pago</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSales.map((sale) => (
                        <tr key={sale._id}>
                            <td>{new Date(sale.createdAt).toLocaleString()}</td>
                            <td>{sale.buyer}</td>
                            <td>{sale.status}</td>
                            <td>{sale.payment}</td>
                            <td>${sale.total.toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SalesList;