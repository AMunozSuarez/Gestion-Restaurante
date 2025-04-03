import React, { useEffect } from 'react';
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos
import { useOrderForm } from '../../hooks/useOrderForm'; // Hook para manejar la lógica del formulario
import OrderForm from '../forms/orderForm'; // Formulario para crear/editar pedidos
import OrderList from '../lists/orderList'; // Lista de pedidos en preparación
import CompletedOrdersList from '../lists/completedOrdersList'; // Lista de pedidos completados/cancelados
import '../../styles/mostrador.css'; // Estilos específicos del mostrador
import useCartStore from '../../store/useCartStore';
import { CSSTransition } from 'react-transition-group';

const Mostrador = () => {
    const { orders, isLoading } = useOrders(); // Pedidos desde TanStack Query
    const {
        customerName,
        setCustomerName,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        editingOrderId,
        setEditingOrderId,
    } = useOrderForm(); // Hook personalizado para manejar el formulario

    const { setCartContext, clearCart } = useCartStore();

    useEffect(() => {
        setCartContext('create'); // Establecer el contexto como "create"
        clearCart(); // Vaciar el carrito al iniciar la creación de un pedido
    }, [setCartContext, clearCart]);

    if (isLoading) return <p>Cargando pedidos...</p>;

    // Filtrar pedidos en preparación y completados/cancelados
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter(
        (order) => order.status === 'Completado' || order.status === 'Cancelado'
    );

    return (
        <CSSTransition
            in={true} // Siempre mostrar en modo creación
            timeout={300}
            classNames="fade"
            unmountOnExit
            
        >
            <div className="mostrador-container creating-mode">
                <h2>Mostrador</h2>
                <div className="mostrador-content">
                    {/* Formulario de creación de pedidos */}
                    <div className="mostrador-create-order">
                        <OrderForm
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            selectedPaymentMethod={selectedPaymentMethod}
                            setSelectedPaymentMethod={setSelectedPaymentMethod}
                            handleSubmit={handleSubmit}
                            editingOrderId={editingOrderId}
                            setEditingOrderId={setEditingOrderId}
                        />
                    </div>

                    {/* Lista de pedidos */}
                    <div className="mostrador-orders-list">
                        <OrderList orders={preparationOrders} setEditingOrderId={setEditingOrderId} />
                    </div>
                </div>

                {/* Pedidos completados/cancelados */}
                <div className="mostrador-completed-orders">
                    <CompletedOrdersList orders={completedOrders} />
                </div>
            </div>
        </CSSTransition>
    );
};

export default Mostrador;