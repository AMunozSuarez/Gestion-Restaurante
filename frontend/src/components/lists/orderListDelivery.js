import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/Lists/orderListDelivery.css';
import { useOrderForm } from '../../hooks/forms/useOrderForm';
import { useOrders } from '../../hooks/api/useOrders';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faClock } from '@fortawesome/free-solid-svg-icons';
import { formatChileanMoney } from '../../services/utils/formatters';

const OrderListDelivery = () => {
    const navigate = useNavigate();
    const { orderNumber } = useParams();
    const { handleUpdateOrderStatus, handleRegisterOrderInCashRegister } = useOrderForm();
    const { orders, isLoading, error } = useOrders();
    
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
                    if (order.section === 'delivery' && order.status === 'Preparacion') {
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

    if (isLoading) return <p>Cargando pedidos...</p>;
    if (error) return <p>Error al cargar los pedidos: {error.message}</p>;

    // Filtrar solo los pedidos con sección "delivery"
    const deliveryOrders = orders.filter(
        (order) => order.section === 'delivery' && order.status === 'Preparacion'
    );

    return (
        <div className="order-list-delivery">
            {/* Botón para crear un nuevo pedido */}
            <button
                className="create-order-button"
                onClick={() => {
                    navigate('/delivery');
                }}
            >
                Crear Pedido +
            </button>
            <h3>Pedidos en Preparación</h3>
            <div className="order-list-header-delivery">
                <p>#</p>
                <p>Fecha/Hora</p>
                <p className="time-elapsed-header">
                    <FontAwesomeIcon icon={faClock} /> Tiempo
                </p>
                <p>Cliente</p>
                <p>Estado</p>
                <p className="order-total-header-delivery">Total</p>
                <p>Enviar</p>
            </div>
            <ul>
                {deliveryOrders.map((order) => (
                    <li
                        key={order._id}
                        onClick={() => navigate(`/delivery/${order.orderNumber}`)}
                        className={`order-item-delivery ${
                            order.orderNumber === parseInt(orderNumber, 10) ? 'editing-delivery' : ''
                        } ${elapsedTimes[order._id] > 30 ? 'delayed-order' : ''}`}
                    >
                        <p>{order.orderNumber}</p>
                        <p className="order-date-delivery">
                            {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p className="time-elapsed-cell">
                            {elapsedTimes[order._id] || 0} min
                        </p>
                        <p>{order.buyer.name}</p>
                        <p>{order.status}</p>
                        <p className="order-total-delivery">{formatChileanMoney(order.total)}</p>
                        {/* Botón para enviar el pedido */}
                        <button
                            className="send-order-button"
                            onClick={async (e) => {
                                e.stopPropagation(); // Evitar que el evento de clic se propague al contenedor padre
                                try {
                                    if (order.foods.length === 0) {
                                        alert('No hay productos en el carrito.');
                                        return;
                                    }

                                    const cleanOrder = {
                                        ...order,
                                        foods: order.foods.map((item) => ({
                                            food: item.food._id,
                                            quantity: item.quantity,
                                            comment: item.comment || '',
                                        })),
                                        status: 'Enviado',
                                    };

                                    console.log('Datos enviados a handleUpdateOrderStatus:', cleanOrder);

                                    // Actualizar el estado del pedido
                                    await handleUpdateOrderStatus(cleanOrder);
                                    console.log(`Pedido #${order.orderNumber} actualizado correctamente.`);

                                    // Registrar el pedido en la caja
                                    await handleRegisterOrderInCashRegister({
                                        cart: order.foods.map((item) => ({
                                            productId: item.food._id,
                                            quantity: item.quantity,
                                        })),
                                        cartTotal: order.total,
                                        deliveryCost: order.deliveryCost || 0,
                                        selectedPaymentMethod: order.payment,
                                    });
                                    console.log(`Pedido #${order.orderNumber} registrado correctamente en la caja.`);
                                } catch (error) {
                                    console.error('Error al procesar el pedido:', error);
                                    alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
                                }
                            }}
                            title={`Enviar Pedido #${order.orderNumber}`}
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderListDelivery;