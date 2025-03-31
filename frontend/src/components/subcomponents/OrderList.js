import React from 'react';
import '../../styles/mostrador.css'; // Asegúrate de que la ruta sea correcta

const OrderList = ({ orders, setEditingOrderId, navigate, updateOrderStatus, loadOrderByNumber, editingOrderId }) => {
    return (
        <div className="mostrador-orders-list">
            <h3>Pedidos en Preparación</h3>
            <div className="mostrador-order-header">
                <p>#</p>
                <p>Cliente</p>
                <p>Estado</p>
                <p>Total</p>
<button
                    className="mostrador-status-button-fake"
                    onClick={() => setEditingOrderId(null)}
                >
                    ‎ ‎ ‎ ‎ Completado
                </button>
            </div>
            <ul>
                {orders.map((order) => {
                    return (
                        <li
                            key={order._id}
                            className={`mostrador-order-item ${editingOrderId === order._id ? 'editing-order' : ''}`}
                            onClick={() => {
                                navigate(`/mostrador/${order.orderNumber}`); // Navega a la URL del pedido
                                loadOrderByNumber(order.orderNumber); // Carga los datos del pedido
                                setEditingOrderId(order._id); // Marca el pedido como seleccionado
                            }}
                        >
                            <p><strong>#{order.orderNumber}</strong></p>
                            <p>{order.buyer || 'N/A'}</p>
                            <p>{order.status}</p>
                            <p>${order.total}</p>
                            <button
                                className="mostrador-status-button"
                                onClick={(e) => {
                                    e.stopPropagation(); // Evita que el clic active la edición
                                    updateOrderStatus(order._id, 'Completado');
                                }}
                            >
                                Completado
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default OrderList;