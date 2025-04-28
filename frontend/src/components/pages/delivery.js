import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useOrderForm } from '../../hooks/useOrderForm';
import OrderFormDelivery from '../forms/orderFormDelivery'; // Importar el nuevo formulario especializado
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
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit: originalHandleSubmit,
        editingOrderId,
        setEditingOrderId,
    } = useOrderForm();
    const { setCartContext, clearCart, setCart } = useCartStore();
    const [deliveryAddress, setDeliveryAddress] = useState(''); // Estado para la dirección de entrega
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el número de teléfono
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
                setCustomerName(foundOrder.buyer);
                setSelectedPaymentMethod(foundOrder.payment);
                setDeliveryAddress(foundOrder.deliveryAddress || '');
                setCustomerPhone(foundOrder.phone || '');

                const cartItems = foundOrder.foods.map((item) => ({
                    _id: item.food._id,
                    title: item.food.title,
                    quantity: item.quantity,
                    price: item.food.price,
                }));
                setCart(cartItems); // Actualizar el carrito solo si cambia el pedido
                setIsViewingCompletedOrder(false);
            }
        } else {
            setEditingOrderId(null);
            setSelectedOrderId(null);
            setIsViewingCompletedOrder(false);
        }
    }, [orderNumber, orders]); // Elimina dependencias innecesarias como setCart

    if (isLoading) return <p>Cargando pedidos...</p>;

    const deliveryOrders = orders.filter((order) => order.section === 'delivery');

    const preparationOrders = deliveryOrders.filter((order) => order.status === 'Preparacion');
    const sentOrders = deliveryOrders.filter((order) => order.status === 'Enviado');
    const deliveredOrders = deliveryOrders.filter((order) => order.status === 'Entregado');

    const handleSubmit = (orderData, resetForm, status = 'Preparacion') => {
        const deliveryOrderData = {
            ...orderData,
            deliveryAddress, // Agregar la dirección de entrega
            phone: customerPhone, // Agregar el número de teléfono
        };
        originalHandleSubmit(deliveryOrderData, resetForm, status, 'delivery', {
            deliveryAddress,
            customerPhone,
        });
    };

    const resetForm = () => {
        setCustomerName('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
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
        setCustomerName(order.buyer);
        setSelectedPaymentMethod(order.payment);
        setDeliveryAddress(order.deliveryAddress || ''); // Cargar la dirección de entrega
        setCustomerPhone(order.phone || ''); // Cargar el número de teléfono

        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
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
                    onClick={() => navigate('/delivery')}
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
                            selectedPaymentMethod={selectedPaymentMethod}
                            setSelectedPaymentMethod={setSelectedPaymentMethod}
                            handleSubmit={handleSubmit}
                            editingOrderId={editingOrderId}
                            setEditingOrderId={setEditingOrderId}
                            isViewingCompletedOrder={isViewingCompletedOrder}
                            resetForm={resetForm}
                        />
                    </div>

                    {editingOrderId && (
                        <div className="delivery-orders-list">
                            <OrderListDelivery
                                orders={preparationOrders}
                                setEditingOrderId={setEditingOrderId}
                            />
                        </div>
                    )}

                    {!editingOrderId && (
                        <div className="delivery-orders-list">
                            <OrderListDelivery
                                orders={preparationOrders}
                                setEditingOrderId={setEditingOrderId}
                            />
                        </div>
                    )}
                </div>

                {!editingOrderId && (
                    <div className="delivery-completed-orders">
                        <CompletedOrdersList
                            orders={[...sentOrders, ...deliveredOrders]}
                            onSelectOrder={handleSelectDeliveredOrder}
                            selectedOrderId={selectedOrderId}
                        />
                    </div>
                )}
            </div>
        </CSSTransition>
    );
};

export default Delivery;