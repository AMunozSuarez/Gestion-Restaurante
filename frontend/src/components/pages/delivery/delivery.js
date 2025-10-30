import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrders, useRecentOrders } from '../../../hooks/api';
import { useOrderForm } from '../../../hooks/order/useOrderForm';
import OrderFormDelivery from '../../forms/specialized/OrderFormDelivery';
import CompletedOrdersList from '../../lists/completedOrdersList';
import '../../../styles/delivery.css';
import useCartStore from '../../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';
import OrderListDelivery from '../../lists/orderListDelivery';
import { useOrderDetailsLogic } from '../../../hooks/order/useOrderDetailsLogic';
import { useCashRegisterStatus } from '../../../hooks/cash/useCashRegisterStatus';
import CashRegisterAlert from '../../common/CashRegisterAlert';

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
    const { orders: recentCompleted = [] } = useRecentOrders({ limit: 10, status: 'Enviado,Cancelado', section: 'delivery', sortBy: 'updatedAt' });
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
        handleUpdateOrderStatus,
        handleRegisterOrderInCash,
    } = useOrderForm();
    const { setCartContext, clearCart, setCart } = useCartStore();
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const navigate = useNavigate();
    const { orderNumber } = useParams();
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Verificar estado de la caja registradora
    const { hasOpenCashRegister, isLoading: cashRegisterLoading, checkCashRegister } = useCashRegisterStatus();
    
    // Estado para controlar si se muestra la alerta
    const [showCashRegisterAlert, setShowCashRegisterAlert] = useState(false);
    
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

    // Mostrar alerta automáticamente si no hay caja abierta al cargar
    useEffect(() => {
        if (!cashRegisterLoading && !hasOpenCashRegister) {
            setShowCashRegisterAlert(true);
        }
    }, [cashRegisterLoading, hasOpenCashRegister]);

    if (isLoading || cashRegisterLoading) return <p>Cargando pedidos...</p>;

    const preparationOrders = orders
        .filter((order) => order.section === 'delivery' && order.status === 'Preparacion')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const completedOrders = recentCompleted;

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
                {/* Mostrar alerta si está activa */}
                {showCashRegisterAlert && (
                    <CashRegisterAlert 
                        onRetry={checkCashRegister}
                        onClose={() => setShowCashRegisterAlert(false)}
                    />
                )}
                
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
                            hasOpenCashRegister={hasOpenCashRegister}
                            onShowCashRegisterAlert={() => setShowCashRegisterAlert(true)}
                        />
                    </div>

                    {/* Columna derecha - Listas apiladas verticalmente */}
                    <div className="delivery-right-column">
                        <div className="delivery-orders-list">
                            <OrderListDelivery
                                orders={preparationOrders}
                                handleUpdateOrderStatus={handleUpdateOrderStatus}
                                handleRegisterOrderInCashRegister={handleRegisterOrderInCash}
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