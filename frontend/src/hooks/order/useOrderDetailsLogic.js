import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';
import { useOrderLoader } from './useOrderLoader';
import { useCompletedOrderSelector } from '../business/useCompletedOrderSelector';
import { useCustomerManagement } from '../customer/useCustomerManagment'; // Importar hook de gestión de clientes

export const useOrderDetailsLogic = ({
  orderNumber,
  section,
  detailsConfig = {},
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orders, updateOrderInList } = useOrders();
  const { cart, setCart, setCartContext } = useCartStore();
  
  // Añadir el hook de gestión de clientes
  const { 
    createOrUpdateCustomer, 
    manageCustomerAddresses 
  } = useCustomerManagement();
  
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
  const handleOrderUpdate = async (e, resetForm, status = 'Preparacion', sectionName = section, extraData = {}) => {
    console.log('useOrderDetailsLogic.js: handleOrderUpdate');
    if (e && e.preventDefault) e.preventDefault();
    if (isViewingCompletedOrder) return;
    if (!editingOrder) return;

    // Obtener el valor más reciente del comentario desde el DOM
    const commentElement = document.getElementById('orderComment');
    const latestComment = commentElement ? commentElement.innerHTML : comment;

    try {
      // Limpiar localStorage para evitar dependencias
      if (localStorage.getItem('editing_address_original')) {
        localStorage.removeItem('editing_address_original');
      }

      // Construir objeto de cliente con la información actual
      let buyerData = {
        name: customerName,
        comment: latestComment,
      };

      // Si el formulario tiene campos específicos para manejo de clientes/direcciones
      if (specificFields) {
        // Para delivery: manejar teléfono del cliente
        if (specificFields.customerPhone) {
          buyerData.phone = specificFields.customerPhone;
          
          // Si hay dirección de entrega, gestionar direcciones
          if (specificFields.deliveryAddress) {
            const addressData = {
              address: specificFields.deliveryAddress,
              deliveryCost: Number(specificFields.deliveryCost) || 0,
            };
            
            // Usar el hook especializado para gestionar direcciones
            const addressOptions = {
              isEditingAddress: extraData?.isEditingAddress,
              originalAddress: extraData?.originalAddress,
              isAddingNewAddress: extraData?.isAddingNewAddress
            };
            
            console.log('Gestionando direcciones para actualización:', addressOptions);
            buyerData.addresses = await manageCustomerAddresses(
              specificFields.customerPhone, 
              addressData, 
              addressOptions
            );
          }
          
          // Crear/actualizar cliente
          console.log('Actualizando cliente con datos:', buyerData);
          const updatedCustomer = await createOrUpdateCustomer(buyerData);
          
          if (updatedCustomer && updatedCustomer._id) {
            // Guardar referencia al ID pero mantener los datos completos para el pedido
            const customerId = updatedCustomer._id;
            buyerData = {
              ...updatedCustomer,
              _id: customerId
            };
          }
        }
      }

      // Construir objeto base para actualizar
      let updatedOrder = {
        _id: editingOrder._id,
        name: null, // Se usa buyer en su lugar
        buyer: buyerData,
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
      
      // Si tenemos direcciones y dirección seleccionada
      if (specificFields && specificFields.deliveryAddress && buyerData.addresses) {
        updatedOrder.selectedAddress = specificFields.deliveryAddress;
        updatedOrder.deliveryCost = Number(specificFields.deliveryCost) || 0;
      }
      
      // Permitir personalización adicional del objeto según tipo
      if (detailsConfig.prepareOrderData) {
        updatedOrder = detailsConfig.prepareOrderData(updatedOrder, {
          specificFields,
          cart,
          comment: latestComment,
          extraData
        });
      }

      console.log('Enviando actualización del pedido:', updatedOrder);
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
        
        return true;
      } else {
        alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
        return false;
      }
    } catch (error) {
      console.error('Error al actualizar pedido:', error);
      alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
      return false;
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
    handleSubmit: handleOrderUpdate, // Mantener compatibilidad
    
    // Listas filtradas
    preparationOrders,
    completedOrders,
  };
};
