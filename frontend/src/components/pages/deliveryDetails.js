import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import useCartStore from '../../store/useCartStore'; // Importar el store global
import OrderFormDelivery from '../forms/orderFormDelivery';
import OrderListDelivery from '../lists/orderListDelivery';
import CompletedOrdersList from '../lists/completedOrdersList';
import { CSSTransition } from 'react-transition-group';
import '../../styles/delivery.css';
import axios from '../../services/axiosConfig';
import { useQueryClient } from '@tanstack/react-query';

const DeliveryDetails = () => {
    const { orderNumber } = useParams();
    const { orders, updateOrderStatus, updateOrderInList } = useOrders();
    const { cart, setCart, increaseQuantity, decreaseQuantity, removeProduct } = useCartStore(); // Usar el store global
    const [editingOrder, setEditingOrder] = useState(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el número de teléfono
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Buscar el pedido por número de pedido
        const foundOrder = orders.find((order) => order.orderNumber === parseInt(orderNumber, 10));
        if (foundOrder) {
            setEditingOrder(foundOrder);
            setCustomerName(foundOrder.buyer);
            setSelectedPaymentMethod(foundOrder.payment);
            setDeliveryAddress(foundOrder.deliveryAddress || '');
            setCustomerPhone(foundOrder.customerPhone || ''); // Cargar el número de teléfono
            const cartItems = foundOrder.foods.map((item) => ({
                _id: item.food._id,
                title: item.food.title,
                quantity: item.quantity,
                price: item.food.price,
                comment: item.comment || '', // Agregar comentario si existe
            }));
            setCart(cartItems); // Actualizar el carrito en el store global
            setIsViewingCompletedOrder(foundOrder.status === 'Enviado' || foundOrder.status === 'Entregado');
        } else {
            if (editingOrder !== null) {
                setEditingOrder(null);
            }
            if (cart.length > 0) {
                setCart([]);
            } // Limpiar el carrito en el store global si no hay pedido seleccionado
        }
        console.log('Pedido encontrado:', foundOrder);
    }, [orderNumber, orders, setCart]);

    const handleSubmit = async (e, orderData, status = 'Preparacion') => {
        if (e) {
            e.preventDefault();
        }
        const updatedOrder = {
            _id: editingOrder._id, // Asegúrate de incluir el _id del pedido
            buyer: customerName, // Nombre del cliente
            payment: selectedPaymentMethod, // Método de pago
            foods: cart.map((item) => ({
                food: item._id, // ID del producto
                quantity: item.quantity, // Cantidad
                comment: item.comment || '', // Comentario (si existe)
            })), // Productos en el carrito
            section: 'delivery', // Sección del pedido
            deliveryAddress, // Dirección de entrega
            status, // Estado del pedido
            customerPhone
        };

        console.log('Pedido actualizado:', updatedOrder);

        try {
            const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

            if (response.status === 200) {
                console.log('Pedido actualizado correctamente:', response.data.order);

                // Invalida la consulta para recargar la lista de pedidos
                queryClient.invalidateQueries(['orders']);
                navigate('/delivery'); // Redirigir a la lista de pedidos después de actualizar
            } else {
                console.error('Error al actualizar el pedido:', response.statusText);
                alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
            }
        } catch (error) {
            console.error('Error al actualizar el pedido:', error);
            alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
        }
    };

    const markAsSent = (orderId) => {
        updateOrderStatus(orderId, 'Enviado');
    };

    const markAsDelivered = (orderId) => {
        updateOrderStatus(orderId, 'Entregado');
    };


    const preparationOrders = orders.filter((order) => order.section === 'delivery' && order.status === 'Preparacion');
    const completedOrders = orders.filter((order) => order.section === 'delivery' && (order.status === 'Enviado' || order.status === 'Entregado'));

    return (
        <CSSTransition
            in={!!editingOrder}
            timeout={300}
            classNames="fade"
            unmountOnExit
            nodeRef={containerRef}
        >
            <div ref={containerRef} className="delivery-container editing-mode">
                {/* Botón para crear un nuevo pedido */}
                <button
                    className="create-order-button"
                    onClick={() => navigate('/delivery')}
                >
                    Crear Pedido +
                </button>

                <div className="delivery-content">
                    <div className="delivery-orders-list">
                        <OrderListDelivery
                            orders={preparationOrders}
                            setEditingOrderId={setEditingOrder}
                        />
                    </div>
                    <div className="delivery-edit-order">
                        {editingOrder ? (
                            <OrderFormDelivery
                                customerName={customerName}
                                setCustomerName={setCustomerName}
                                customerPhone={customerPhone}
                                setCustomerPhone={setCustomerPhone}
                                deliveryAddress={deliveryAddress}
                                setDeliveryAddress={setDeliveryAddress}
                                selectedPaymentMethod={selectedPaymentMethod}
                                setSelectedPaymentMethod={setSelectedPaymentMethod}
                                handleSubmit={handleSubmit}
                                editingOrderId={editingOrder ? editingOrder._id : null}
                                setEditingOrderId={setEditingOrder}
                                isViewingCompletedOrder={isViewingCompletedOrder}
                                cart={cart}
                                increaseQuantity={increaseQuantity}
                                decreaseQuantity={decreaseQuantity}
                                removeProduct={removeProduct}
                            />
                        ) : (
                            <p>Selecciona un pedido para ver los detalles.</p>
                        )}
                    </div>
                </div>
                <div className="delivery-completed-orders">
                    <CompletedOrdersList
                        orders={completedOrders}
                        onSelectOrder={(order) => setEditingOrder(order)}
                        selectedOrderId={selectedOrderId}
                    />
                </div>
            </div>
        </CSSTransition>
    );
};

export default DeliveryDetails;