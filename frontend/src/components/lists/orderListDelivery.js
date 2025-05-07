import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/orderListDelivery.css'; // Estilos específicos para la lista de pedidos de delivery
import { useOrderForm } from '../../hooks/useOrderForm'; // Hook para manejar el formulario de pedidos

const OrderListDelivery = ({ orders }) => {
    const navigate = useNavigate();
    const { orderNumber } = useParams(); // Obtener el número de pedido desde la URL
    const { resetForm } = useOrderForm(); // Hook para manejar el formulario de pedidos

    // Filtrar solo los pedidos con sección "delivery"
    const deliveryOrders = orders.filter((order) => order.section === 'delivery');

    return (
        <div className="order-list-delivery">
            {/* Botón para crear un nuevo pedido */}
            <button
                    className="create-order-button"
                    onClick={() => {
                        resetForm(); // Limpia el formulario
                        navigate('/delivery'); // Navega a la página de creación de pedidos
                    }}
                >
                    Crear Pedido +
                </button>
            <h3>Pedidos en Preparación</h3>
            <div className="order-list-header-delivery">
                <p>#</p>
                <p>Fecha/Hora</p>
                <p>Cliente</p>
                <p>Estado</p>
                <p className="order-total-header-delivery">Total</p>
            </div>
            <ul>
                {deliveryOrders.map((order) => (
                    <li
                        key={order._id}
                        onClick={() => navigate(`/delivery/${order.orderNumber}`)}
                        className={`order-item-delivery ${
                            order.orderNumber === parseInt(orderNumber, 10) ? 'editing-delivery' : ''
                        }`}
                    >
                        <p>{order.orderNumber}</p>
                        <p className="order-date-delivery">
                            {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p>{order.buyer.name}</p>
                        <p>{order.status}</p>
                        <p className="order-total-delivery">${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderListDelivery;