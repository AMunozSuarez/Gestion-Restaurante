import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useOrderForm } from '../../hooks/useOrderForm';
import OrderFormDelivery from '../forms/orderFormDelivery'; // Importar el formulario especializado
import CompletedOrdersList from '../lists/completedOrdersList';
import '../../styles/delivery.css';
import useCartStore from '../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';
import OrderListDelivery from '../lists/orderListDelivery';

const Delivery = () => {
    const { orders, isLoading, updateOrderStatus } = useOrders();
    const {
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        deliveryAddress,
        setDeliveryAddress,
        deliveryCost,
        setDeliveryCost,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        editingOrderId,
        setEditingOrderId,
        comment,
        setComment,
    } = useOrderForm(); // Usar el hook actualizado
    const { setCartContext, clearCart, setCart } = useCartStore();
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const { orderNumber } = useParams();

    useEffect(() => {
        // Establecer el contexto del carrito solo una vez al montar el componente
        setCartContext('delivery');
        clearCart(); // Limpiar el carrito solo al montar
    }, []); // Elimina dependencias innecesarias como setCartContext y clearCart

    useEffect(() => {
        if (orderNumber) {
            const foundOrder = orders.find((order) => order.orderNumber === parseInt(orderNumber, 10));
            if (foundOrder) {
                setEditingOrderId(foundOrder._id);
                setSelectedOrderId(foundOrder._id);
                setCustomerName(foundOrder.buyer.name);
                setCustomerPhone(foundOrder.buyer.phone);
                setDeliveryAddress(foundOrder.selectedAddress || '');
                setDeliveryCost(foundOrder.buyer.deliveryAddress.deliveryCost || 0);
                setSelectedPaymentMethod(foundOrder.payment);
                setComment(foundOrder.comment || '');

                const cartItems = foundOrder.foods.map((item) => ({
                    _id: item.food._id,
                    title: item.food.title,
                    quantity: item.quantity,
                    price: item.food.price,
                    comment: item.comment || '',
                }));
                setCart(cartItems); // Actualizar el carrito solo si cambia el pedido
                setIsViewingCompletedOrder(false);
            }
        } else {
            setEditingOrderId(null);
            setSelectedOrderId(null);
            setIsViewingCompletedOrder(false);
        }
    }, [orderNumber, orders, setCart]); // Elimina dependencias innecesarias como setCart

    if (isLoading) return <p>Cargando pedidos...</p>;

    const deliveryOrders = orders.filter((order) => order.section === 'delivery');

    const preparationOrders = deliveryOrders.filter((order) => order.status === 'Preparacion');
    const sentOrders = deliveryOrders.filter((order) => order.status === 'Enviado');
    const deliveredOrders = deliveryOrders.filter((order) => order.status === 'Entregado');

    const resetForm = () => {
        setCustomerName('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
        setCustomerPhone('');
        setDeliveryCost(0);
        setComment('');
        clearCart(); // Limpiar el carrito
        setEditingOrderId(null); // Restablecer el ID del pedido en edición
    };

    const markAsSent = (orderId) => {
        updateOrderStatus(orderId, 'Enviado');
    };

    const markAsDelivered = (orderId) => {
        updateOrderStatus(orderId, 'Entregado');
    };

    const handleSelectDeliveredOrder = (order) => {
        setEditingOrderId(order._id); // Activar modo de edición
        setSelectedOrderId(order._id);
        setCustomerName(order.buyer.name);
        setCustomerPhone(order.buyer.phone);
        setDeliveryAddress(order.selectedAddress || ''); // Cargar la dirección de entrega
        setDeliveryCost(order.deliveryCost || 0); // Cargar el costo de envío
        setSelectedPaymentMethod(order.payment);
        setComment(order.comment || '');

        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
            comment: item.comment || '',
        }));
        setCart(cartItems);

        setIsViewingCompletedOrder(false); // Asegurarse de que no esté en modo de solo visualización
    };

    return (
        <CSSTransition
            in={true}
            timeout={300}
            classNames="fade"
            unmountOnExit
        >
            <div className="delivery-container creating-mode">
                {/* Botón para crear un nuevo pedido */}
                <button
                    className="create-order-button"
                    onClick={() => {
                        resetForm(); // Limpia el formulario
                        navigate('/delivery'); // Navega a la página de creación de pedidos
                    }}
                >
                    Crear Pedido +
                </button>

                <div className="delivery-content">
                    <div className="delivery-create-order">
                        <OrderFormDelivery
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            customerPhone={customerPhone}
                            setCustomerPhone={setCustomerPhone}
                            deliveryAddress={deliveryAddress}
                            setDeliveryAddress={setDeliveryAddress}
                            deliveryCost={deliveryCost} // Pasa el estado del costo de envío
                            setDeliveryCost={setDeliveryCost} // Pasa la función para actualizar el costo de envío
                            selectedPaymentMethod={selectedPaymentMethod}
                            setSelectedPaymentMethod={setSelectedPaymentMethod}
                            handleSubmit={handleSubmit}
                            editingOrderId={editingOrderId}
                            setEditingOrderId={setEditingOrderId}
                            isViewingCompletedOrder={isViewingCompletedOrder}
                            resetForm={resetForm}
                            comment={comment}
                            setComment={setComment}
                        />
                    </div>

                    <div className="delivery-orders-list">
                        <OrderListDelivery
                            orders={preparationOrders}
                            setEditingOrderId={setEditingOrderId}
                        />
                    </div>
                </div>
                    <div className="delivery-completed-orders">
                        <CompletedOrdersList
                            orders={deliveredOrders}
                            onSelectOrder={handleSelectDeliveredOrder}
                            selectedOrderId={selectedOrderId}
                        />
                    </div>
                
            </div>
        </CSSTransition>
    );
};

export default Delivery;