import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/Lists/orderList.css';
import { useOrderForm } from '../../hooks/order/useOrderForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { formatChileanMoney } from '../../services/utils/formatters';

const OrderList = ({ orders }) => {
    const navigate = useNavigate();
    const { orderNumber } = useParams();
    const { resetForm } = useOrderForm();
    
    // Estado para almacenar los tiempos transcurridos
    const [elapsedTimes, setElapsedTimes] = useState({});
    
    // Función para calcular el tiempo transcurrido en minutos
    const calculateElapsedMinutes = (createdAt) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diff = (now - created) / (1000 * 60); // Diferencia en minutos
        return Math.floor(diff);
    };
    
    // Actualizar los tiempos cada 60 segundos
    useEffect(() => {
        const updateTimes = () => {
            const times = {};
            if (orders && orders.length > 0) {
                orders.forEach(order => {
                    if (order.section === 'mostrador' && order.status === 'Preparacion') {
                        times[order._id] = calculateElapsedMinutes(order.createdAt);
                    }
                });
            }
            setElapsedTimes(times);
        };
        
        // Actualizar tiempos inmediatamente
        updateTimes();
        
        // Configurar intervalo para actualizar los tiempos
        const interval = setInterval(updateTimes, 60000); // Actualizar cada minuto
        
        return () => clearInterval(interval);
    }, [orders]);

    // Filtrar solo los pedidos con sección "mostrador" y estado "Preparacion"
    const mostradorOrders = orders.filter(
        (order) => order.section === 'mostrador' && order.status === 'Preparacion'
    );

    return (
        <div className="order-list">
            {/* Botón para crear un nuevo pedido */}
            <button
                className="create-order-button-mostrador"
                onClick={() => {
                    resetForm();
                    navigate('/mostrador');
                }}
            >
                Crear Pedido +
            </button>
            <h3>Pedidos en Preparación</h3>
            <div className="order-list-header">
                <p>#</p>
                <p>Fecha/Hora</p>
                <p className="time-elapsed-header">
                    <FontAwesomeIcon icon={faClock} /> Tiempo
                </p>
                <p>Cliente</p>
                <p>Estado</p>
                <p className="order-total-header">Total</p>
            </div>
            
            {/* Verificar si hay pedidos para mostrar */}
            {mostradorOrders.length > 0 ? (
                <ul>
                    {mostradorOrders.map((order) => (
                        <li
                            key={order._id}
                            onClick={() => navigate(`/mostrador/${order.orderNumber}`)}
                            className={`order-item ${
                                order.orderNumber === parseInt(orderNumber, 10) ? 'editing' : ''
                            } ${elapsedTimes[order._id] > 30 ? 'delayed-order' : ''}`}
                        >
                            <p>{order.orderNumber}</p>
                            <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
                            <p className="time-elapsed-cell">
                                {elapsedTimes[order._id] || 0} min
                            </p>
                            <p>{order.buyer ? order.buyer.name : order.name}</p>
                            <p>{order.status}</p>
                            <p className="order-total">{formatChileanMoney(order.total)}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="no-orders-message">
                    <p>No hay pedidos en preparación</p>
                </div>
            )}
        </div>
    );
};

export default OrderList;