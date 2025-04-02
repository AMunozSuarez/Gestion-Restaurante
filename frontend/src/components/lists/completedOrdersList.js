import React from 'react';
import '../../styles/completedOrderList.css'; // Estilos específicos de la lista de pedidos completados/cancelados

const CompletedOrdersList = ({ orders }) => {
    return (
        <div className="completed-orders-list">
            <h3>Pedidos Completados/Cancelados</h3>
            <ul>
                {orders.map((order) => (
                    <li key={order._id} className={order.status}>
                        <p>#{order.orderNumber}</p>
                        <p>{order.buyer}</p>
                        <p>{order.status}</p>
                        <p className="order-total">Total: ${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CompletedOrdersList;