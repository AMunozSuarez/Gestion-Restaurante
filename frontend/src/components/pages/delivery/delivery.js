import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../../../hooks/api/useOrders';
import { useOrderForm } from '../../../hooks/forms/useOrderForm';
import OrderFormDelivery from '../../forms/specialized/OrderFormDelivery';
import CompletedOrdersList from '../../lists/completedOrdersList';
import '../../../styles/delivery.css';
import useCartStore from '../../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';
import OrderListDelivery from '../../lists/orderListDelivery';
import { useOrderDetailsLogic } from '../../../hooks/business/useOrderDetailsLogic';

// Definir la configuración específica para pedidos de delivery
const deliveryConfig = {
  // Configuración de cómo se detectan pedidos completados en delivery
  checkCompletedStatus: (order) => 
    order.status === 'Enviado' || order.status === 'Cancelado',
  
  // Función para cargar campos específicos de delivery
  loadSpecificFields: (order) => ({
    customerPhone: order.buyer?.phone || '',
    deliveryAddress: order.selectedAddress || '',
    deliveryCost: order.deliveryCost || 0
  })
};

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
    } = useOrderForm();
    const { setCartContext, clearCart, setCart } = useCartStore();
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const { orderNumber } = useParams();
    
    // Usar SOLO handleSelectCompletedOrder del hook useOrderDetailsLogic
    const { handleSelectCompletedOrder: selectOrderFromHook } = useOrderDetailsLogic({
      section: 'delivery',
      detailsConfig: deliveryConfig
    });

    useEffect(() => {
        // Establecer el contexto del carrito solo una vez al montar el componente
        setCartContext('delivery');
        clearCart(); // Limpiar el carrito solo al montar
    }, []);

    useEffect(() => {
        console.log('useEffect en delivery.js que se ejecuta al cargar el componente');
        if (orderNumber) {
            const foundOrder = orders.find((order) => order.orderNumber === parseInt(orderNumber, 10));
            if (foundOrder) {
                setEditingOrderId(foundOrder._id);
                setSelectedOrderId(foundOrder._id);
                setCustomerName(foundOrder.buyer.name);
                setCustomerPhone(foundOrder.buyer.phone);
                setDeliveryAddress(foundOrder.selectedAddress || '');
                setDeliveryCost(foundOrder.deliveryCost || 0);
                setSelectedPaymentMethod(foundOrder.payment);
                setComment(foundOrder.comment || '');

                const cartItems = foundOrder.foods.map((item) => ({
                    _id: item.food._id,
                    title: item.food.title,
                    quantity: item.quantity,
                    price: item.food.price,
                    comment: item.comment || '',
                }));
                setCart(cartItems);
                
                setIsViewingCompletedOrder(false);
            }
        } else {
            setEditingOrderId(null);
            setSelectedOrderId(null);
            setIsViewingCompletedOrder(false);
        }
    }, [orderNumber, orders]);

    if (isLoading) return <p>Cargando pedidos...</p>;

    const preparationOrders = orders.filter((order) => order.section === 'delivery' && order.status === 'Preparacion');
    const completedOrders = orders.filter((order) => order.section === 'delivery' && (order.status === 'Enviado' || order.status === 'Cancelado'));

    const resetForm = () => {
        setCustomerName('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
        setCustomerPhone('');
        setDeliveryCost('');
        setComment('');
        clearCart();
        setEditingOrderId(null);
    };

    // Función para cancelar un pedido
    const cancelOrder = (orderId) => {
        console.log(`Cancelando el pedido ${orderId}.`);
        updateOrderStatus(orderId, 'Cancelado');
    };

    // Envoltorio para handleSelectCompletedOrder que mantiene la lógica específica de Delivery
    const handleSelectCompletedOrder = (order) => {
        
        // Mantener estados locales específicos de Delivery
        setEditingOrderId(order._id);
        setSelectedOrderId(order._id);
        setIsViewingCompletedOrder(true);
        
        // Usar la función del hook
        selectOrderFromHook(order);
        
        // Si hay alguna lógica adicional específica de Delivery, puede ir aquí
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
                    {/* Columna izquierda - OrderForm ocupa todo el alto */}
                    <div className="delivery-left-column delivery-create-order">
                        <OrderFormDelivery
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            customerPhone={customerPhone}
                            setCustomerPhone={setCustomerPhone}
                            deliveryAddress={deliveryAddress}
                            setDeliveryAddress={setDeliveryAddress}
                            deliveryCost={deliveryCost}
                            setDeliveryCost={setDeliveryCost}
                            selectedPaymentMethod={selectedPaymentMethod}
                            setSelectedPaymentMethod={setSelectedPaymentMethod}
                            handleSubmit={handleSubmit}
                            editingOrderId={editingOrderId}
                            setEditingOrderId={setEditingOrderId}
                            isViewingCompletedOrder={isViewingCompletedOrder}
                            resetForm={resetForm}
                            comment={comment}
                            setComment={setComment}
                            cancelOrder={cancelOrder}
                        />
                    </div>

                    {/* Columna derecha - Listas apiladas verticalmente */}
                    <div className="delivery-right-column">
                        <div className="delivery-orders-list">
                            <OrderListDelivery
                                orders={preparationOrders}
                                setEditingOrderId={setEditingOrderId}
                            />
                        </div>
                        
                        <div className="delivery-completed-orders">
                            <CompletedOrdersList
                                orders={completedOrders}
                                onSelectOrder={handleSelectCompletedOrder}
                                selectedOrderId={selectedOrderId}
                                section="delivery"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </CSSTransition>
    );
};

export default Delivery;