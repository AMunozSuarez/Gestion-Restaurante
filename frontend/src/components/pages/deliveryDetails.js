import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import OrderFormDelivery from '../forms/orderFormDelivery';
import OrderListDelivery from '../lists/orderListDelivery';
import CompletedOrdersList from '../lists/completedOrdersList';
import { CSSTransition } from 'react-transition-group';
import '../../styles/delivery.css';

const DeliveryDetails = () => {
    const { orderNumber } = useParams();
    const { orders, updateOrderStatus } = useOrders();
    const [editingOrder, setEditingOrder] = useState(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [cart, setCart] = useState([]); // Manejar el carrito como estado local
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        // Buscar el pedido por número de pedido
        const foundOrder = orders.find((order) => order.orderNumber === parseInt(orderNumber, 10));
        if (foundOrder) {
            setEditingOrder(foundOrder);
            setCustomerName(foundOrder.buyer);
            setSelectedPaymentMethod(foundOrder.payment);
            setDeliveryAddress(foundOrder.deliveryAddress || '');
            const cartItems = foundOrder.foods.map((item) => ({
                _id: item.food._id,
                title: item.food.title,
                quantity: item.quantity,
                price: item.food.price,
            }));
            setCart(cartItems); // Actualizar el carrito directamente
            setIsViewingCompletedOrder(foundOrder.status === 'Enviado' || foundOrder.status === 'Entregado');
        } else {
            setEditingOrder(null);
            setCart([]); // Limpiar el carrito si no hay pedido seleccionado
        }
    }, [orderNumber, orders]);

    const handleSubmit = (orderData, resetForm, status = 'Preparacion') => {
        const updatedOrder = {
            ...orderData,
            section: 'delivery',
            deliveryAddress,
        };
        console.log('Pedido actualizado:', updatedOrder);
        resetForm();
    };

    const markAsSent = (orderId) => {
        updateOrderStatus(orderId, 'Enviado');
    };

    const markAsDelivered = (orderId) => {
        updateOrderStatus(orderId, 'Entregado');
    };

    const resetForm = () => {
        setCustomerName('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('');
        setCart([]);
        setEditingOrder(null);
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
                                deliveryAddress={deliveryAddress}
                                setDeliveryAddress={setDeliveryAddress}
                                selectedPaymentMethod={selectedPaymentMethod}
                                setSelectedPaymentMethod={setSelectedPaymentMethod}
                                handleSubmit={handleSubmit}
                                editingOrderId={editingOrder._id}
                                isViewingCompletedOrder={isViewingCompletedOrder}
                                cart={cart} // Pasar el carrito
                                increaseQuantity={(id) => {
                                    const updatedCart = cart.map((item) =>
                                        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
                                    );
                                    setCart(updatedCart);
                                }}
                                decreaseQuantity={(id) => {
                                    const updatedCart = cart.map((item) =>
                                        item._id === id && item.quantity > 1
                                            ? { ...item, quantity: item.quantity - 1 }
                                            : item
                                    );
                                    setCart(updatedCart);
                                }}
                                removeProduct={(id) => {
                                    const updatedCart = cart.filter((item) => item._id !== id);
                                    setCart(updatedCart);
                                }}
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