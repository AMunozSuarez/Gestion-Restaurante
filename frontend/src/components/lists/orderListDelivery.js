import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/Lists/orderListDelivery.css';
import { useOrderForm } from '../../hooks/order/useOrderForm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faClock } from '@fortawesome/free-solid-svg-icons';
import { formatChileanMoney } from '../../services/utils/formatters';
import { focusOnElement } from '../common/focus';


const OrderListDelivery = ({ orders = [], handleUpdateOrderStatus = null, handleRegisterOrderInCashRegister = null }) => {
    const navigate = useNavigate();
    const { orderNumber } = useParams();
    
    // Si no se proporcionan las funciones como props, obtenemos las funciones del hook
    const orderForm = useOrderForm();
    const updateOrderStatus = handleUpdateOrderStatus || orderForm.handleUpdateOrderStatus;
    const registerOrderInCashRegister = handleRegisterOrderInCashRegister || orderForm.handleRegisterOrderInCashRegister;
    
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
                    times[order._id] = calculateElapsedMinutes(order.createdAt);
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

    // Ya no es necesario filtrar los pedidos, ya que recibimos solo los pedidos que necesitamos
    // como prop desde el componente padre, ya filtrados y ordenados

    // Modificar la sección del return donde se muestra la lista de pedidos
    return (
        <div className="order-list-delivery">
            {/* Botón para crear un nuevo pedido */}
            <button
                className="create-order-button"
                onClick={() => {
                    navigate('/delivery');
                    focusOnElement("customerPhone");
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
            
            {/* Verificar si hay pedidos para mostrar */}
            {orders.length > 0 ? (
                <ul>
                    {orders.map((order) => (
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

                                        // Construir objeto con todos los campos requeridos por el backend
                                        // Validar que la dirección seleccionada existe en buyer.addresses
                                        let selectedAddress = order.selectedAddress || null;
                                        let buyerAddresses = (order.buyer && order.buyer.addresses) ? order.buyer.addresses : [];
                                        const addressExists = buyerAddresses.some(addr => addr.address === selectedAddress);
                                        if (!addressExists) {
                                            alert('La dirección seleccionada no existe para este cliente. No se puede enviar el pedido.');
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
                                            section: order.section,
                                            payment: order.payment,
                                            buyer: order.buyer && typeof order.buyer === 'object' 
                                                ? order.buyer 
                                                : { _id: order.buyer },
                                            selectedAddress,
                                            comment: order.comment || '',
                                        };

                                        console.log('Datos enviados a handleUpdateOrderStatus:', cleanOrder);

                                        // Actualizar el estado del pedido
                                        await updateOrderStatus(cleanOrder);
                                        console.log(`Pedido #${order.orderNumber} actualizado correctamente.`);

                                        // Registrar el pedido en la caja
                                        await registerOrderInCashRegister({
                                            items: order.foods.map((item) => ({
                                                productId: item.food._id,
                                                quantity: item.quantity,
                                            })),
                                            total: order.total,
                                            deliveryCost: order.deliveryCost || 0,
                                            paymentMethod: order.payment,
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
            ) : (
                <div className="no-orders-message">
                    <p>No hay pedidos en preparación</p>
                </div>
            )}
        </div>
    );
};

export default OrderListDelivery;