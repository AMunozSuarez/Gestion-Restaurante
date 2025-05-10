import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/orderListDelivery.css'; // Estilos específicos para la lista de pedidos de delivery
import { useOrderForm } from '../../hooks/forms/useOrderForm'; // Hook para manejar el formulario de pedidos
import { useOrders } from '../../hooks/api/useOrders'; // Hook para obtener las órdenes
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

const OrderListDelivery = () => {
    const navigate = useNavigate();
    const { orderNumber } = useParams(); // Obtener el número de pedido desde la URL
    const { handleUpdateOrderStatus, handleRegisterOrderInCashRegister } = useOrderForm(); // Hook para manejar el formulario de pedidos
    const { orders, isLoading, error } = useOrders(); // Obtener pedidos desde React Query

    if (isLoading) return <p>Cargando pedidos...</p>;
    if (error) return <p>Error al cargar los pedidos: {error.message}</p>;

    // Filtrar solo los pedidos con sección "delivery"
    const deliveryOrders = orders.filter(
        (order) => order.section === 'delivery' && order.status === 'Preparacion'
    );
    console.log('Datos para handleCloseOrder:', deliveryOrders);

    return (
        <div className="order-list-delivery">
            {/* Botón para crear un nuevo pedido */}
            <button
                className="create-order-button"
                onClick={() => {
                    navigate('/delivery'); // Navega a la página de creación de pedidos
                }}
            >
                Crear Pedido +
            </button>
            <h3>Pedidos en Preparación</h3>
            <div className="order-list-header-delivery">
                <p>#</p>
                <p>Fecha/Hora</p>
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
                        }`}
                    >
                        <p>{order.orderNumber}</p>
                        <p className="order-date-delivery">
                            {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p>{order.buyer.name}</p>
                        <p>{order.status}</p>
                        <p className="order-total-delivery">${order.total}</p>
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