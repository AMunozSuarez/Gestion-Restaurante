import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../../hooks/api/useOrders'; // Hook para obtener las órdenes
import { useOrderForm } from '../../hooks/forms/useOrderForm'; // Hook para manejar el formulario de pedidos
import OrderFormDelivery from '../forms/specialized/OrderFormDelivery';
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

    const preparationOrders = orders.filter((order) => order.section === 'delivery' && order.status === 'Preparacion');
    const completedOrders = orders.filter((order) => order.section === 'delivery' && (order.status === 'Enviado' || order.status === 'Cancelado'));

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

    // Función para cancelar un pedido
    const cancelOrder = (orderId) => {
        console.log(`Cancelando el pedido ${orderId}.`);
        updateOrderStatus(orderId, 'Cancelado'); // Llama a la API o actualiza el estado local
    };

    const handleSelectCompletedOrder = (order) => {
        setEditingOrderId(null); // Desmarcar cualquier pedido en edición
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

        setIsViewingCompletedOrder(true); // Asegurarse de que no esté en modo de solo visualización
        navigate(`/delivery/${order.orderNumber}`); // Navegar a la URL del pedido
    };

    return (
        <CSSTransition
            in={true}
            timeout={300}
            classNames="fade"
            unmountOnExit
        >
            <div className="delivery-container creating-mode">
                

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
                            cancelOrder={cancelOrder} // Asegúrate de pasar esta función
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
                            orders={completedOrders}
                            onSelectOrder={handleSelectCompletedOrder}
                            selectedOrderId={selectedOrderId}
                            section="delivery" // Pasar la sección para el título dinámico
                        />
                    </div>
                
            </div>
        </CSSTransition>
    );
};

export default Delivery;