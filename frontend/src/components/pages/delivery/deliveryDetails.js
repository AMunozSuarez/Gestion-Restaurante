import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrderDetailsLogic } from '../../../hooks/business/useOrderDetailsLogic';
import OrderDetailsBase from '../../layout/OrderDetailsBase';
import OrderFormDelivery from '../../forms/specialized/OrderFormDelivery';
import OrderListDelivery from '../../lists/orderListDelivery';
import '../../../styles/delivery.css';

const DeliveryDetails = () => {
  const { orderNumber } = useParams();
  
  // Configuración específica para pedidos de delivery
  const deliveryConfig = {
    // Verificar si un pedido está completado/enviado
    checkCompletedStatus: (order) => 
      order.status === 'Enviado' || order.status === 'Entregado',
    
    // Campos específicos para delivery
    initialFields: {
      customerPhone: '',
      deliveryAddress: '',
      deliveryCost: '',
    },
    
    // Cargar campos específicos desde un pedido
    loadSpecificFields: (order) => ({
      customerPhone: order.buyer?.phone || '',
      deliveryAddress: order.selectedAddress || '',
      deliveryCost: order.total - order.foods.reduce(
        (sum, item) => sum + item.food.price * item.quantity, 0
      ) || 0,
    }),
    
    // Preparar objeto de pedido con campos específicos
    prepareOrderData: (orderData, { specificFields }) => ({
      ...orderData,
      buyer: {
        ...orderData.buyer,
        phone: specificFields.customerPhone,
        addresses: [
          {
            address: specificFields.deliveryAddress,
            deliveryCost: Number(specificFields.deliveryCost) || 0,
          },
        ],
      },
      selectedAddress: specificFields.deliveryAddress,
      deliveryCost: Number(specificFields.deliveryCost) || 0,
      // Recalcular el total incluyendo el costo de envío
      total: orderData.foods.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity, 
        0
      ) + Number(specificFields.deliveryCost || 0),
    }),
    
    // Filtro para pedidos completados
    completedOrdersFilter: (order) => 
      order.section === 'delivery' && 
      (order.status === 'Enviado' || order.status === 'Entregado'),
  };
  
  // Usar el hook lógico
  const {
    editingOrder,
    setEditingOrder,
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isViewingCompletedOrder,
    comment,
    setComment,
    selectedOrderId,
    specificFields,
    updateField,
    handleSelectCompletedOrder,
    handleSubmit,
    preparationOrders,
    completedOrders,
  } = useOrderDetailsLogic({
    orderNumber,
    section: 'delivery',
    detailsConfig: deliveryConfig,
  });

  // Configurar propiedades para el formulario de delivery
  const formProps = {
    customerName,
    setCustomerName,
    customerPhone: specificFields.customerPhone,
    setCustomerPhone: (value) => updateField('customerPhone', value),
    deliveryAddress: specificFields.deliveryAddress,
    setDeliveryAddress: (value) => updateField('deliveryAddress', value),
    deliveryCost: specificFields.deliveryCost,
    setDeliveryCost: (value) => updateField('deliveryCost', value),
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleSubmit,
    editingOrderId: editingOrder?._id,
    setEditingOrderId: () => {},
    isViewingCompletedOrder,
    comment,
    setComment,
    resetForm: () => {},
  };
  
  // Configurar propiedades para la lista
  const listProps = {
    setEditingOrderId: setEditingOrder,
  };
  
  // Configurar propiedades para la lista de completados
  const completedListProps = {
    onSelectOrder: handleSelectCompletedOrder,
    selectedOrderId,
    section: 'delivery',
  };

  return (
    <OrderDetailsBase
      editingOrder={editingOrder}
      containerClass="delivery"
      OrderFormComponent={OrderFormDelivery}
      OrderListComponent={OrderListDelivery}
      formProps={formProps}
      listProps={listProps}
      completedListProps={completedListProps}
      preparationOrders={preparationOrders}
      completedOrders={completedOrders}
    />
  );
};

export default DeliveryDetails;