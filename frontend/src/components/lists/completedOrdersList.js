import React from 'react';

const CompletedOrdersList = ({ orders }) => {
    return (
        <div className="completed-orders-list">
            <h3>Pedidos Completados/Cancelados</h3>
            <ul>
                {orders.map((order) => (
                    <li key={order._id}>
                        <p>Cliente: {order.customerName}</p>
                        <p>Estado: {order.status}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CompletedOrdersList;