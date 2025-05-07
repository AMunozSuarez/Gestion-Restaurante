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
    const [deliveryCost, setDeliveryCost] = useState(''); // Estado para el costo de envío
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el número de teléfono
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const queryClient = useQueryClient();
    const [comment, setComment] = useState(''); // Estado para comentarios opcionales

    useEffect(() => {
        // Buscar el pedido por número de pedido
        const foundOrder = orders.find((order) => order.orderNumber === parseInt(orderNumber, 10));
        if (foundOrder) {
            setEditingOrder(foundOrder);
            setCustomerName(foundOrder.buyer.name); // Leer el nombre del cliente desde el objeto buyer
            setCustomerPhone(foundOrder.buyer.phone); // Leer el teléfono del cliente desde el objeto buyer
            setComment(foundOrder.comment || foundOrder.buyer.comment || ''); // Leer el comentario del cliente
            setSelectedPaymentMethod(foundOrder.payment);
            setDeliveryAddress(foundOrder.selectedAddress || ''); // Leer la dirección seleccionada
            setDeliveryCost(foundOrder.total - foundOrder.foods.reduce((sum, item) => sum + item.food.price * item.quantity, 0)); // Calcular el costo de envío
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

    const handleSelectCompletedOrder = (order) => {
        setEditingOrder(order);
        setCustomerName(order.buyer.name); // Leer el nombre del cliente desde el objeto buyer
        setCustomerPhone(order.buyer.phone); // Leer el teléfono del cliente desde el objeto buyer
        setComment(order.comment || order.buyer.comment || ''); // Leer el comentario del cliente
        setSelectedPaymentMethod(order.payment);
        setDeliveryAddress(order.selectedAddress || ''); // Leer la dirección seleccionada
        setDeliveryCost(order.total - order.foods.reduce((sum, item) => sum + item.food.price * item.quantity, 0)); // Calcular el costo de envío
        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
            comment: item.comment || '', // Agregar comentario si existe
        }));
        setCart(cartItems); // Actualizar el carrito en el store global

        setIsViewingCompletedOrder(true);
        setSelectedOrderId(order._id); // Establecer el pedido seleccionado
        console.log('Pedido seleccionado:', order);

        // Navegar a la URL del pedido seleccionado
        navigate(`/delivery/${order.orderNumber}`);
    };

    const handleSubmit = async (e, orderData, status = 'Preparacion') => {
        if (e) {
            e.preventDefault();
        }

        const updatedOrder = {
            _id: editingOrder._id, // Asegúrate de incluir el _id del pedido
            buyer: {
                name: customerName, // Nombre del cliente
                phone: customerPhone, // Teléfono del cliente
                addresses: [
                    {
                        address: deliveryAddress, // Dirección de entrega
                        deliveryCost: Number(deliveryCost) || 0, // Costo de envío actualizado
                    },
                ],
                comment: comment || '', // Comentario del cliente (si existe)
            },
            payment: selectedPaymentMethod, // Método de pago
            foods: cart.map((item) => ({
                food: item._id, // ID del producto
                quantity: item.quantity, // Cantidad
                comment: item.comment || '', // Comentario (si existe)
            })), // Productos en el carrito
            section: 'delivery', // Sección del pedido
            selectedAddress: deliveryAddress, // Dirección de entrega
            deliveryCost: Number(deliveryCost) || 0, // Asegúrate de incluir el costo de envío aquí
            status, // Estado del pedido
        };

        console.log('Pedido actualizado:', updatedOrder);

        try {
            const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

            if (response.status === 200) {
                console.log('Pedido actualizado correctamente:', response.data.order);

                // Invalida la consulta para recargar la lista de pedidos
                queryClient.invalidateQueries(['orders']);
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
                                deliveryCost={deliveryCost} // Pasa el estado del costo de envío
                                setDeliveryCost={setDeliveryCost} // Pasa la función para actualizar el costo de envío
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
                                comment={comment}
                                setComment={setComment}
                            />
                        ) : (
                            <p>Selecciona un pedido para ver los detalles.</p>
                        )}
                    </div>
                </div>
                <div className="delivery-completed-orders">
                    <CompletedOrdersList
                        orders={completedOrders}
                        onSelectOrder={handleSelectCompletedOrder}
                        selectedOrderId={selectedOrderId}
                        section={'delivery'}
                    />
                </div>
            </div>
        </CSSTransition>
    );
};

export default DeliveryDetails;