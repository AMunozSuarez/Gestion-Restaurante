import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrderDetailsLogic } from '../../../hooks/order/useOrderDetailsLogic';
import OrderDetailsBase from '../../layout/OrderDetailsBase';
import OrderFormMostrador from '../../forms/specialized/OrderFormMostrador';
import OrderList from '../../lists/orderList';
import '../../../styles/orderDetails.css';
import { useCashRegisterStatus } from '../../../hooks/cash/useCashRegisterStatus';
import CashRegisterAlert from '../../common/CashRegisterAlert';

const OrderDetails = () => {
  const { orderNumber } = useParams();
  
  // Verificar estado de la caja registradora
  const { hasOpenCashRegister, isLoading: cashRegisterLoading, checkCashRegister } = useCashRegisterStatus();
  
  // Estado para controlar si se muestra la alerta
  const [showCashRegisterAlert, setShowCashRegisterAlert] = React.useState(false);
  
  // Mostrar alerta automáticamente si no hay caja abierta al cargar
  React.useEffect(() => {
    if (!cashRegisterLoading && !hasOpenCashRegister) {
      setShowCashRegisterAlert(true);
    }
  }, [cashRegisterLoading, hasOpenCashRegister]);
  
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
    // Opciones para obtener los pedidos completados recientes (mantener paridad con la vista de creación)
    recentCompletedOptions: { limit: 10, status: 'Completado,Cancelado', section: 'mostrador', sortBy: 'updatedAt' }
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
    hasOpenCashRegister,
    onShowCashRegisterAlert: () => setShowCashRegisterAlert(true),
  };
  
  // Configurar propiedades para la lista de completados
  const completedListProps = {
    onSelectOrder: handleSelectCompletedOrder,
    selectedOrderId,
  };

  return (
    <>
      {/* Mostrar alerta si está activa */}
      {showCashRegisterAlert && (
        <CashRegisterAlert 
          onRetry={checkCashRegister}
          onClose={() => setShowCashRegisterAlert(false)}
        />
      )}
      
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
    </>
  );
};

export default OrderDetails;