import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrderDetailsLogic } from '../../../hooks/business/useOrderDetailsLogic';
import OrderDetailsBase from '../../layout/OrderDetailsBase';
import OrderFormMostrador from '../../forms/specialized/OrderFormMostrador';
import OrderList from '../../lists/orderList';
import '../../../styles/orderDetails.css';

const OrderDetails = () => {
  const { orderNumber } = useParams();
  
  // Configuración específica para pedidos de mostrador
  const mostradorConfig = {
    // Verificar si un pedido está completado
    checkCompletedStatus: (order) => 
      order.status === 'Completado' || order.status === 'Cancelado',
    
    // No hay campos específicos para mostrador, pero la estructura es extensible
    initialFields: {},
    
    // No necesita personalización para el objeto de pedido
    prepareOrderData: (orderData) => orderData,
    
    // Filtro para pedidos completados
    completedOrdersFilter: (order) => 
      order.section === 'mostrador' && 
      (order.status === 'Completado' || order.status === 'Cancelado'),
  };
  
  // Usar el hook lógico
  const {
    editingOrder,
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isViewingCompletedOrder,
    comment,
    setComment,
    selectedOrderId,
    handleSelectCompletedOrder,
    handleOrderUpdate,
    preparationOrders,
    completedOrders,
  } = useOrderDetailsLogic({
    orderNumber,
    section: 'mostrador',
    detailsConfig: mostradorConfig,
  });

  // Configurar propiedades para el formulario
  const formProps = {
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleOrderUpdate,
    editingOrderId: editingOrder?._id,
    setEditingOrderId: () => {},
    isViewingCompletedOrder,
    comment,
    setComment,
    resetForm: () => {},
  };
  
  // Configurar propiedades para la lista de completados
  const completedListProps = {
    onSelectOrder: handleSelectCompletedOrder,
    selectedOrderId,
  };

  return (
    <OrderDetailsBase
      editingOrder={editingOrder}
      containerClass="mostrador"
      OrderFormComponent={OrderFormMostrador}
      OrderListComponent={OrderList}
      formProps={formProps}
      completedListProps={completedListProps}
      preparationOrders={preparationOrders}
      completedOrders={completedOrders}
    />
  );
};

export default OrderDetails;