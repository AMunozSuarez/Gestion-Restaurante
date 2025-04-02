import React from 'react';
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos
import { useOrderForm } from '../../hooks/useOrderForm'; // Hook para manejar la lógica del formulario
import OrderForm from '../forms/orderForm'; // Formulario para crear/editar pedidos
import OrderList from '../lists/orderList'; // Lista de pedidos en preparación
import CompletedOrdersList from '../lists/completedOrdersList'; // Lista de pedidos completados/cancelados
import '../../styles/mostrador.css'; // Estilos específicos del mostrador

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

    if (isLoading) return <p>Cargando pedidos...</p>;

    // Filtrar pedidos en preparación y completados/cancelados
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter(
        (order) => order.status === 'Completado' || order.status === 'Cancelado'
    );

    return (
        <div className="mostrador-container">
            <h2>Mostrador</h2>
            <OrderForm
                customerName={customerName}
                setCustomerName={setCustomerName}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
                handleSubmit={handleSubmit}
                editingOrderId={editingOrderId}
                setEditingOrderId={setEditingOrderId}
            />
            <OrderList orders={preparationOrders} setEditingOrderId={setEditingOrderId} />
            <CompletedOrdersList orders={completedOrders} />
        </div>
    );
};

export default Mostrador;