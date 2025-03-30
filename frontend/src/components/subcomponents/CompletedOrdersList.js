import React from 'react';

const CompletedOrdersList = ({ orders }) => {
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
                    <li key={order._id} className={`mostrador-completed-order-item ${order.status}`}>
                        <p><strong>#{order.orderNumber}</strong></p>
                        <p>{order.buyer || 'N/A'}</p>
                        <p>{order.status}</p>
                        <p>${order.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CompletedOrdersList;