import React from 'react';
import { useParams } from 'react-router-dom';

const CompletedOrdersList = ({ orders, navigate, editingOrderId }) => {
    const { orderNumber } = useParams(); // Obtén el número de la orden desde la URL
    return (
        <div className="mostrador-completed-orders-list">
            <h3>Pedidos Completados/Cancelados</h3>
            <div className="mostrador-order-header">
                <p>#</p>
                <p>Cliente</p>
                <p>Estado</p>
                <p>Total</p>
            </div>
            <ul>
                {orders.map((order) => (
                    <li
                        key={order._id}
                        className={`mostrador-completed-order-item ${String(order.status)} ${
                            String(order.orderNumber) === String(orderNumber) ? 'selected-completed-order' : ''
                        }`}
                        onClick={() => navigate(`/mostrador/${order.orderNumber}`)} // Navega a la URL del pedido
                    >
                        <p><strong>#{order.orderNumber}</strong></p>
                        <p>{order.buyer || ''}</p>
                        <p>{order.status}</p>
                        <p>${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CompletedOrdersList;