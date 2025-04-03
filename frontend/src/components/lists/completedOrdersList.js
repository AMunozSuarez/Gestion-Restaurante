import React from 'react';
import '../../styles/completedOrderList.css';

const CompletedOrdersList = ({ orders, onSelectOrder, selectedOrderId }) => {
    return (
        <div className="completed-orders-list">
            <h3>Pedidos Completados/Cancelados</h3>
            <ul>
                {orders.map((order) => (
                    <li
                        key={order._id}
                        className={`${order.status} ${order._id === selectedOrderId ? 'selected' : ''}`}
                        onClick={() => onSelectOrder(order)}
                    >
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