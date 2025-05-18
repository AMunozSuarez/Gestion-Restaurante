import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../../hooks/api/useOrders'; // Hook para obtener las órdenes
import { useOrderForm } from '../../../hooks/order/useOrderForm'; // Hook para manejar el formulario de pedidos
import OrderFormMostrador from '../../forms/specialized/OrderFormMostrador';
import OrderList from '../../lists/orderList';
import CompletedOrdersList from '../../lists/completedOrdersList';
import '../../../styles/mostrador.css';
import useCartStore from '../../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';
import { useOrderDetailsLogic } from '../../../hooks/order/useOrderDetailsLogic'; // Importar hook

// Configuración específica para pedidos de mostrador
const mostradorConfig = {
  checkCompletedStatus: (order) => 
    order.status === 'Completado' || order.status === 'Cancelado',
  
  // Mostrador no tiene campos específicos adicionales como delivery
  loadSpecificFields: () => ({}),
  
  completedOrdersFilter: (order) => 
    order.section === 'mostrador' && 
    (order.status === 'Completado' || order.status === 'Cancelado')
};

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
    
    // Usar SOLO handleSelectCompletedOrder del hook useOrderDetailsLogic
    const { handleSelectCompletedOrder: selectOrderFromHook } = useOrderDetailsLogic({
      section: 'mostrador',
      detailsConfig: mostradorConfig
    });

    useEffect(() => {
        setCartContext('create');
        clearCart();
    }, [setCartContext, clearCart]);

    if (isLoading) return <p>Cargando pedidos...</p>;

    // Filtrar pedidos en preparación y completados/cancelados
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter((order) => order.section === 'mostrador' && (order.status === 'Completado' || order.status === 'Cancelado'));

    // Refactorizado para usar el hook especializado
    const handleSelectCompletedOrder = (order) => {
        console.log('Pedido completado/cancelado seleccionado en mostrador:');
        
        // Mantener estados locales específicos de Mostrador
        setEditingOrderId(null); // Desmarcar cualquier pedido en edición
        setSelectedOrderId(order._id); // Marcar el pedido completado seleccionado
        setIsViewingCompletedOrder(true); // Activar modo de solo visualización
        
        // Usar la función del hook para la lógica común
        selectOrderFromHook(order);
        
        // Cualquier lógica adicional específica de Mostrador puede ir aquí
        console.log('Pedido seleccionado:', order);
    };

    // Función para marcar un pedido como completado
    const markAsCompleted = (orderId) => {
        console.log(`Marcando el pedido ${orderId} como completado.`);
        updateOrderStatus(orderId, 'Completado'); // Llama a la API o actualiza el estado local
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
                    {/* Columna izquierda - OrderForm ocupa todo el alto */}
                    <div className="mostrador-left-column mostrador-create-order">
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
                            resetForm={resetForm}
                            comment={comment}
                            setComment={setComment}
                        />
                    </div>

                    {/* Columna derecha - Listas apiladas verticalmente */}
                    <div className="mostrador-right-column">
                        <div className="mostrador-orders-list">
                            <OrderList
                                orders={preparationOrders}
                            />
                        </div>
                        
                        <div className="mostrador-completed-orders">
                            <CompletedOrdersList
                                orders={completedOrders}
                                onSelectOrder={handleSelectCompletedOrder}
                                selectedOrderId={selectedOrderId}
                                section="mostrador"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </CSSTransition>
    );
};

export default Mostrador;