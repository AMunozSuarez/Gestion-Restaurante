import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import OrderForm from '../forms/orderForm'; // Formulario para crear/editar pedidos
import OrderList from '../lists/orderList'; // Lista de pedidos en preparación
import CompletedOrdersList from '../lists/completedOrdersList'; // Lista de pedidos completados/cancelados
import axios from '../../services/axiosConfig'; // Asegúrate de tener axios instalado
import { useQueryClient } from '@tanstack/react-query'; // Para invalidar la caché de pedidos
import { CSSTransition } from 'react-transition-group'; // Importar CSSTransition
import '../../styles/orderDetails.css'; // Estilos específicos del mostrador

const OrderDetails = () => {
    const { orderNumber } = useParams();
    const { orders, updateOrderInList } = useOrders();
    const { cart, setCart, setCartContext } = useCartStore();
    const [editingOrder, setEditingOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null); // Nuevo estado
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const containerRef = useRef(null);

    useEffect(() => {
        setCartContext('edit');

        const foundOrder = orders.find((o) => o.orderNumber === parseInt(orderNumber, 10));
        setEditingOrder(foundOrder || null);

        if (foundOrder) {
            const cartItems = foundOrder.foods.map((item) => ({
                _id: item.food._id,
                title: item.food.title,
                quantity: item.quantity,
                price: item.food.price,
                comment: item.comment || '', // Agregar comentario si existe
            }));
            setCart(cartItems);

            // Verificar si buyer es null antes de acceder a sus propiedades
            setCustomerName(foundOrder.buyer ? foundOrder.buyer.name : foundOrder.name);
            setSelectedPaymentMethod(foundOrder.payment);

            // Verificar si el pedido está completado o cancelado
            if (foundOrder.status === 'Completado' || foundOrder.status === 'Cancelado') {
                setIsViewingCompletedOrder(true);
            } else {
                setIsViewingCompletedOrder(false);
            }
        }
    }, [orderNumber, orders, setCart, setCartContext]);

    const handleSelectCompletedOrder = (order) => {
        setEditingOrder(order);

        // Verificar si buyer es null antes de acceder a sus propiedades
        setCustomerName(order.buyer ? order.buyer.name : order.name);
        setSelectedPaymentMethod(order.payment);

        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
            comment: item.comment || '', // Agregar comentario si existe
        }));
        setCart(cartItems);

        setIsViewingCompletedOrder(true);
        setSelectedOrderId(order._id); // Establecer el pedido seleccionado

        // Navegar a la URL del pedido seleccionado
        navigate(`/mostrador/${order.orderNumber}`);
    };

    const handleSubmit = async (e, status = 'Preparacion') => {
        if (e && e.preventDefault) e.preventDefault(); // Verificar si 'e' existe antes de llamar a preventDefault

        if (isViewingCompletedOrder) return; // No permitir guardar en modo de solo visualización

        const updatedOrder = {
            ...editingOrder,
            buyer: customerName,
            payment: selectedPaymentMethod,
            foods: cart.map((item) => ({
                food: item._id,
                quantity: item.quantity,
                price: item.price,
                comment: item.comment || '', // Agregar comentario si existe
            })),
            status, // Usar el estado pasado como argumento
        };

        console.log('Actualizando pedido:', updatedOrder);

        try {
            const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

            if (response.status === 200) {
                if (response.data.order && response.data.order._id) {
                    updateOrderInList(response.data.order);
                }
                queryClient.invalidateQueries(['orders']);
                // navigate('/mostrador');
            } else {
                alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
            }
        } catch (error) {
            alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
        }
    };

    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter(
        (order) => order.status === 'Completado' || order.status === 'Cancelado'
    );

    return (
        <CSSTransition
            in={!!editingOrder}
            timeout={300}
            classNames="fade"
            unmountOnExit
            nodeRef={containerRef}
        >
            <div ref={containerRef} className="mostrador-container editing-mode">
                {/* Botón para crear un nuevo pedido */}
                <button
                    className="create-order-button-mostrador"
                    onClick={() => navigate('/mostrador')}
                >
                    Crear Pedido +
                </button>

                <div className="mostrador-content">
                    <div className="mostrador-orders-list">
                        <OrderList orders={preparationOrders} />
                    </div>
                    <div className="mostrador-edit-order">
                        {editingOrder ? (
                            <OrderForm
                                customerName={customerName}
                                setCustomerName={setCustomerName}
                                selectedPaymentMethod={selectedPaymentMethod}
                                setSelectedPaymentMethod={setSelectedPaymentMethod}
                                handleSubmit={handleSubmit}
                                editingOrderId={editingOrder._id}
                                setEditingOrderId={() => {}}
                                isViewingCompletedOrder={isViewingCompletedOrder} // Pasar el estado
                            />
                        ) : (
                            <p>Selecciona un pedido para ver los detalles.</p>
                        )}
                    </div>
                </div>
                <div className="mostrador-completed-orders">
                    <CompletedOrdersList
                        orders={completedOrders}
                        onSelectOrder={handleSelectCompletedOrder} // Pasar la función
                        selectedOrderId={selectedOrderId} // Pasar el pedido seleccionado
                    />
                </div>
            </div>
        </CSSTransition>
    );
};

export default OrderDetails;