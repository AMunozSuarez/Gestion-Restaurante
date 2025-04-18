import React, { useState } from 'react';
import '../../styles/admin/salesList.css'; // Estilos específicos para la lista de ventas
import AdminSubheader from './adminSubheader'; // Subheader para navegación
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos

const SalesList = () => {
    const { orders, isLoading, error } = useOrders(); // Usar el hook useOrders
    const [selectedSale, setSelectedSale] = useState(null); // Estado para la venta seleccionada
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0], // Fecha actual
        status: '',
        paymentMethod: '',
        section: '',
    });

    // Filtrar las órdenes según los filtros seleccionados
    const filteredOrders = orders.filter((order) => {
        const matchesDate = filters.date ? order.createdAt.startsWith(filters.date) : true;
        const matchesStatus = filters.status ? order.status === filters.status : true;
        const matchesPayment = filters.paymentMethod ? order.payment === filters.paymentMethod : true;
        const matchesSection = filters.section ? order.section === filters.section : true;

        return matchesDate && matchesStatus && matchesPayment && matchesSection;
    });

    // Manejar la selección de una venta
    const handleViewSale = (sale) => {
        setSelectedSale(sale);
    };

    if (isLoading) {
        return <div>Cargando ventas...</div>;
    }

    if (error) {
        return <div>Error al cargar las ventas: {error.message}</div>;
    }

    return (
        <div className="sales-page">
            <AdminSubheader /> {/* Subheader para cambiar entre páginas */}
            <div className="sales-container">
                {/* Filtros */}
                <div className="sales-filters">
                    <h3>Filtros</h3>
                    <form>
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
                                <option value="Cancelado">Cancelado</option>
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
                                <option value="Débito">Débito</option>
                                <option value="Crédito">Crédito</option>
                            </select>
                        </label>
                        <label>
                            Sección:
                            <select
                                value={filters.section}
                                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                            >
                                <option value="">Todas</option>
                                <option value="Mostrador">Mostrador</option>
                                <option value="Delivery">Delivery</option>
                                <option value="Mesa">Mesa</option>
                            </select>
                        </label>
                    </form>
                </div>

                {/* Contenedor de lista y detalle */}
                <div className="sales-content">
                    {/* Lista de ventas */}
                    <div className="sales-list">
                        <h3>Lista de Ventas</h3>
                        <div className="sales-header">
                            <p>Fecha</p>
                            <p>Cliente</p>
                            <p>Estado</p>
                            <p>Método de Pago</p>
                            <p>Total</p>
                        </div>
                        <ul className="sales-items">
                            {filteredOrders.map((sale) => (
                                <li
                                    key={sale._id}
                                    className={`sales-item ${selectedSale && selectedSale._id === sale._id ? 'active' : ''}`}
                                    onClick={() => handleViewSale(sale)}
                                >
                                    <p>{new Date(sale.createdAt).toLocaleString()}</p>
                                    <p>{sale.buyer}</p>
                                    <p>{sale.status}</p>
                                    <p>{sale.payment}</p>
                                    <p>${sale.total}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Detalle de la venta seleccionada */}
                    {selectedSale && (
                        <div className="sales-detail">
                            <h3>Detalle de Venta</h3>
                            <section className="detail-section">
                                <h4>Información General</h4>
                                <div className="detail-row">
                                    <p><strong>Fecha:</strong></p>
                                    <p>{new Date(selectedSale.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="detail-row">
                                    <p><strong>Cliente:</strong></p>
                                    <p>{selectedSale.buyer}</p>
                                </div>
                                <div className="detail-row">
                                    <p><strong>Estado:</strong></p>
                                    <p>{selectedSale.status}</p>
                                </div>
                                <div className="detail-row">
                                    <p><strong>Método de Pago:</strong></p>
                                    <p>{selectedSale.payment}</p>
                                </div>
                                <div className="detail-row">
                                    <p><strong>Total:</strong></p>
                                    <p>${selectedSale.total}</p>
                                </div>
                            </section>

                            <section className="detail-section">
                                <h4>Productos</h4>
                                <ul>
                                    {selectedSale.foods.map((food, index) => (
                                        <li key={index}>
                                            <strong>{food.food.title}:</strong> {food.quantity} x ${food.food.price}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesList;