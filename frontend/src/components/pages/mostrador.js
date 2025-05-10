import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/api/useOrders'; // Hook para obtener las órdenes
import { useOrderForm } from '../../hooks/forms/useOrderForm'; // Hook para manejar el formulario de pedidos
import OrderFormMostrador from '../forms/specialized/OrderFormMostrador';
import OrderList from '../lists/orderList';
import CompletedOrdersList from '../lists/completedOrdersList';
import '../../styles/mostrador.css';
import useCartStore from '../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';

const Mostrador = () => {
    const { orders, isLoading, updateOrderStatus } = useOrders();
    const {
        customerName,
        setCustomerName,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        editingOrderId,
        setEditingOrderId,
    } = useOrderForm();
    const { setCartContext, clearCart, setCart } = useCartStore();
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null); // Estado para el pedido completado seleccionado
    const [comment, setComment] = useState(''); // Estado para el comentario
    const navigate = useNavigate();

    useEffect(() => {
        setCartContext('create');
        clearCart();
    }, [setCartContext, clearCart]);

    if (isLoading) return <p>Cargando pedidos...</p>;

    // Filtrar pedidos en preparación y completados/cancelados
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter((order) => order.section === 'mostrador' && (order.status === 'Completado' || order.status === 'Cancelado'));

    // Manejar la selección de un pedido completado/cancelado
    const handleSelectCompletedOrder = (order) => {
        setEditingOrderId(null); // Desmarcar cualquier pedido en edición
        setSelectedOrderId(order._id); // Marcar el pedido completado seleccionado
        setCustomerName(order.buyer?.name || '');
        setSelectedPaymentMethod(order.payment);
        setComment(order.comment || ''); // Establecer el comentario si existe
        

        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
        }));
        setCart(cartItems);

        setIsViewingCompletedOrder(true); // Activar modo de solo visualización
        console.log('Pedido seleccionado:', order);

        // Redirigir a la URL del pedido completado/cancelado
        navigate(`/mostrador/${order.orderNumber}`);
    };

    // Función para marcar un pedido como completado
    const markAsCompleted = (orderId) => {
        console.log(`Marcando el pedido ${orderId} como completado.`);
        updateOrderStatus(orderId, 'Completado'); // Llama a la API o actualiza el estado local
    };

    



    // Manejar la selección de un pedido en edición
    const handleSelectEditingOrder = (orderId) => {
        setSelectedOrderId(null); // Desmarcar cualquier pedido completado seleccionado
        setEditingOrderId(orderId); // Marcar el pedido en edición
        setIsViewingCompletedOrder(false); // Desactivar modo de solo visualización
        navigate(`/mostrador/${orderId}`); // Navegar al pedido en edición
    };

    // Función para volver al estado de "Crear Pedido"
        const resetForm = () => {
            setCustomerName('');
            setSelectedPaymentMethod('Efectivo');
            clearCart();
            setEditingOrderId(null);
            setComment(''); // Restablecer el comentario
        };

    return (
        <CSSTransition
            in={true}
            timeout={300}
            classNames="fade"
            unmountOnExit
        >
            <div className="mostrador-container creating-mode">

                <div className="mostrador-content">
                    {/* Formulario de creación/edición de pedidos */}
                    <div className="mostrador-create-order">
                        <OrderFormMostrador
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            selectedPaymentMethod={selectedPaymentMethod}
                            setSelectedPaymentMethod={setSelectedPaymentMethod}
                            handleSubmit={handleSubmit}
                            editingOrderId={editingOrderId}
                            setEditingOrderId={setEditingOrderId}
                            isViewingCompletedOrder={isViewingCompletedOrder}
                            markAsCompleted={markAsCompleted}
                            resetForm={resetForm} // Asegúrate de pasar esta función
                            comment={comment} // Pasa el estado del comentario
                            setComment={setComment} // Pasa la función para actualizar el comentario
                        />
                    </div>

                    {/* Lista de pedidos en preparación */}
                    <div className="mostrador-orders-list">
                        <OrderList
                            orders={preparationOrders}
                            setEditingOrderId={handleSelectEditingOrder}
                        />
                    </div>
                </div>

                {/* Lista de pedidos completados/cancelados */}
                <div className="mostrador-completed-orders">
                    <CompletedOrdersList
                        orders={completedOrders}
                        onSelectOrder={handleSelectCompletedOrder}
                        selectedOrderId={selectedOrderId} // Pasar el pedido completado seleccionado
                    />
                </div>
            </div>
        </CSSTransition>
    );
};

export default Mostrador;