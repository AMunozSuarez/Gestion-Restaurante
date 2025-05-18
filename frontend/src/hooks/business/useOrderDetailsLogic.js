import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';
import { useOrderLoader } from './useOrderLoader';
import { useCompletedOrderSelector } from './useCompletedOrderSelector'; // Importar nuevo hook

export const useOrderDetailsLogic = ({
  orderNumber,
  section,
  detailsConfig = {},
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orders, updateOrderInList } = useOrders();
  const { cart, setCart, setCartContext } = useCartStore();
  
  // Usar el nuevo hook para cargar el pedido
  const {
    loadedOrder: editingOrder,
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    comment,
    setComment,
    isCompletedOrder: isViewingCompletedOrder,
    specificFields,
    updateField,
    reloadOrder
  } = useOrderLoader({
    orderNumber,
    config: {
      checkCompletedStatus: detailsConfig.checkCompletedStatus,
      loadSpecificFields: detailsConfig.loadSpecificFields,
      initialFields: detailsConfig.initialFields
    }
  });
  
  // Usar el hook especializado para selección de pedidos completados
  const { selectCompletedOrder } = useCompletedOrderSelector();
  
  // Estados adicionales específicos de esta vista
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Seleccionar un pedido completado para ver sus detalles
  const handleSelectCompletedOrder = (order) => {
    console.log('Pedido completado seleccionado en logic:', order);
    
    setSelectedOrderId(order._id);
    
    // Usar el hook especializado
    selectCompletedOrder(order, {
      section,
      setCustomerName,
      setSelectedPaymentMethod,
      setComment,
      updateField,
      loadSpecificFields: detailsConfig.loadSpecificFields
    });
  };

    // Filtrar pedidos según su estado
  const preparationOrders = orders.filter(
    (order) => order.section === section && order.status === 'Preparacion'
  );
  
  // Personalizar el filtro para completados según tipo
  const completedOrdersFilter = detailsConfig.completedOrdersFilter || 
    ((order) => order.section === section && 
               (order.status === 'Completado' || order.status === 'Cancelado'));
               
  const completedOrders = orders.filter(completedOrdersFilter);

  // Enviar actualización de pedido
  const handleOrderUpdate = async (e, resetForm, status = 'Preparacion', sectionName = section) => {
    
    console.log('useOrderDetailsLogic.js: handleSubmit');
    if (e && e.preventDefault) e.preventDefault();
    if (isViewingCompletedOrder) return;
    if (!editingOrder) return;

    // Obtener el valor más reciente del comentario desde el DOM
    const commentElement = document.getElementById('orderComment');
    const latestComment = commentElement ? commentElement.innerHTML : comment;

    // Construir objeto base para actualizar
    let updatedOrder = {
      _id: editingOrder._id,
      name: null, // Se usa buyer en su lugar
      buyer: {
        name: customerName,
        comment: latestComment,
      },
      foods: cart.map((item) => ({
        food: item._id,
        quantity: item.quantity,
        comment: item.comment || '',
      })),
      payment: selectedPaymentMethod,
      section: sectionName,
      status,
      comment: latestComment,
    };
    
    // Permitir personalización del objeto según tipo
    if (detailsConfig.prepareOrderData) {
      updatedOrder = detailsConfig.prepareOrderData(updatedOrder, {
        specificFields,
        cart,
        comment: latestComment,
      });
    }

    try {
      console.log('updateOrder en useOrderDetailsLogic.js:');
      const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

      if (response.status === 200) {
        if (response.data.order && response.data.order._id) {
          updateOrderInList(response.data.order);
        }
        queryClient.invalidateQueries(['orders']);
        
        if (resetForm) {
          resetForm();
        }
        
        if (status !== 'Preparacion') {
          navigate(`/${sectionName}`);
        }
      } else {
        alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al actualizar pedido:', error);
      alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
    }
  };



  return {
    // Estados base
    editingOrder,
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isViewingCompletedOrder,
    comment,
    setComment,
    selectedOrderId,
    
    // Estados específicos
    specificFields,
    updateField,
    
    // Métodos
    handleSelectCompletedOrder,
    handleOrderUpdate,
    
    // Listas filtradas
    preparationOrders,
    completedOrders,
  };
};
