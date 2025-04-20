import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import useCartStore from '../../store/useCartStore'; // Importar el store global
import OrderFormDelivery from '../forms/orderFormDelivery';
import OrderListDelivery from '../lists/orderListDelivery';
import CompletedOrdersList from '../lists/completedOrdersList';
import { CSSTransition } from 'react-transition-group';
import '../../styles/delivery.css';

const DeliveryDetails = () => {
    const { orderNumber } = useParams();
    const { orders, updateOrderStatus } = useOrders();
    const { cart, setCart, increaseQuantity, decreaseQuantity, removeProduct } = useCartStore(); // Usar el store global
    const [editingOrder, setEditingOrder] = useState(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
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
    }, [orderNumber, orders, setCart]);

    const handleSubmit = (e, orderData, resetForm, status = 'Preparacion') => {
        e.preventDefault(); // Prevenir la recarga de la página
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
        setCart([]); // Limpiar el carrito en el store global
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
                                cart={cart} // Pasar el carrito desde el store global
                                increaseQuantity={increaseQuantity} // Usar la función del store global
                                decreaseQuantity={decreaseQuantity} // Usar la función del store global
                                removeProduct={removeProduct} // Usar la función del store global
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