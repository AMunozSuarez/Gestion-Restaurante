import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/orderList.css'; // Estilos específicos de la lista de pedidos

const OrderList = ({ orders }) => {
    const navigate = useNavigate();

    return (
        <div className="order-list">
            <h3>Pedidos en Preparación</h3>
<div className="order-list-header">
                <p>#</p>
                <p>Cliente</p>
                <p>Estado</p>
                <p className="order-total-header">Total</p>
            </div>
            <ul>
                {orders.map((order) => (
                    <li
                        key={order._id}
                        onClick={() => navigate(`/mostrador/${order.orderNumber}`)}
                        className="order-item"
                    >
                        <p>{order.orderNumber}</p>
                        <p>{order.buyer}</p>
                        <p>{order.status}</p>
                        <p className="order-total">${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderList;