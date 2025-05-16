import React from 'react';
import { useParams } from 'react-router-dom'; // Importar useParams para obtener el orderNumber de la URL
import '../../styles/Lists/completedOrderList.css'; // Importar estilos específicos de la lista de pedidos completados
import { formatChileanMoney } from '../../services/utils/formatters';

const CompletedOrdersList = ({ orders, onSelectOrder, section }) => {
    const { orderNumber } = useParams(); // Obtener el número de pedido desde la URL

    // Determinar el título dinámicamente según la sección
    const title = section === 'delivery' ? 'Pedidos Enviados' : 'Pedidos Completados/Cancelados';
    
    // Determinar el mensaje cuando no hay pedidos según la sección
    const noOrdersMessage = section === 'delivery' 
        ? 'No hay pedidos enviados'
        : 'No hay pedidos completados o cancelados';

    return (
        <div className="completed-orders-list">
            <h3>{title}</h3> {/* Mostrar el título dinámico */}
            {/* Encabezado de la lista */}
            <div className="completed-orders-header">
                <p>#</p>
                <p>Fecha/Hora</p> {/* Mostrar fecha/hora */}
                <p>Cliente</p>
                <p>Estado</p>
                <p>Total</p>
            </div>
            
            {/* Verificar si hay pedidos para mostrar */}
            {orders && orders.length > 0 ? (
                <ul>
                    {orders.map((order) => (
                        <li
                            key={order._id}
                            className={`order-item ${order.status} ${order.orderNumber === parseInt(orderNumber, 10) ? 'selected' : ''}`}
                            onClick={() => onSelectOrder(order)}
                        >
                            <p>#{order.orderNumber}</p>
                            <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p> {/* Mostrar fecha/hora */}
                            <p>{order.buyer ? order.buyer.name : order.name}</p>
                            <p>{order.status}</p>
                            <p className="order-total">Total: {formatChileanMoney(order.total)}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="no-orders-message">
                    <p>{noOrdersMessage}</p>
                </div>
            )}
        </div>
    );
};

export default CompletedOrdersList;