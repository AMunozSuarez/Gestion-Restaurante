import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/orderList.css'; // Estilos específicos de la lista de pedidos
import { useOrderForm } from '../../hooks/useOrderForm'; // Hook para manejar el formulario de pedidos

const OrderList = ({ orders }) => {
    const navigate = useNavigate();
    const { orderNumber } = useParams(); // Obtener el número de pedido desde la URL
    const { resetForm } = useOrderForm(); // Hook para manejar el formulario de pedidos

    // Filtrar solo los pedidos con sección "mostrador"
    const mostradorOrders = orders.filter((order) => order.section === 'mostrador');

    return (
        <div className="order-list">
            {/* Botón para crear un nuevo pedido */}
            <button
                    className="create-order-button-mostrador"
                    onClick={() => {
                        resetForm(); // Limpia el formulario
                        navigate('/mostrador'); // Navega a la página de creación de pedidos
                    }}
                >
                    Crear Pedido +
                </button>
            <h3>Pedidos en Preparación</h3>
            <div className="order-list-header">
                <p>#</p>
                <p>Fecha/Hora</p> {/* Mostrar fecha/hora */}
                <p>Cliente</p>
                <p>Estado</p>
                <p className="order-total-header">Total</p>
            </div>
            <ul>
                {mostradorOrders.map((order) => (
                    <li
                        key={order._id}
                        onClick={() => navigate(`/mostrador/${order.orderNumber}`)}
                        className={`order-item ${order.orderNumber === parseInt(orderNumber, 10) ? 'editing' : ''}`}
                    >
                        <p>{order.orderNumber}</p>
                        <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p> {/* Mostrar fecha/hora */}
                        <p>{order.buyer ? order.buyer.name : order.name}</p> {/* Manejar casos donde buyer es null */}
                        <p>{order.status}</p>
                        <p className="order-total">${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderList;