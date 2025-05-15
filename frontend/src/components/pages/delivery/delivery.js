import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders } from '../../../hooks/api/useOrders'; // Hook para obtener los pedidos
import { useOrderForm } from '../../../hooks/forms/useOrderForm'; // Hook para manejar el formulario de pedidos
import OrderFormDelivery from '../../forms/specialized/OrderFormDelivery';
import CompletedOrdersList from '../../lists/completedOrdersList';
import '../../../styles/delivery.css';
import useCartStore from '../../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';
import OrderListDelivery from '../../lists/orderListDelivery';

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
                
                // Corregir esto: usar la propiedad deliveryCost directa del pedido
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
                
                // Importante: asegurarnos de que no estamos en modo de solo visualización
                // si estamos editando un pedido
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
        setDeliveryCost('');
        setComment('');
        clearCart(); // Limpiar el carrito
        setEditingOrderId(null); // Restablecer el ID del pedido en edición
    };

    // Función para cancelar un pedido
    const cancelOrder = (orderId) => {
        console.log(`Cancelando el pedido ${orderId}.`);
        updateOrderStatus(orderId, 'Cancelado'); // Llama a la API o actualiza el estado local
    };

    const handleSelectCompletedOrder = (order) => {
        console.log('Pedido completo seleccionado en delivery');
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