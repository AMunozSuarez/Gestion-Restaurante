import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import axios from '../services/axiosConfig';
import useCartStore from '../store/useCartStore';
import { useOrders } from './useOrders';

export const useOrderDetailsLogic = ({
  orderNumber,
  section,
  detailsConfig = {},
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orders, updateOrderInList } = useOrders();
  const { cart, setCart, setCartContext } = useCartStore();
  
  // Estados comunes
  const [editingOrder, setEditingOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
  const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Estados específicos para delivery (o cualquier tipo futuro)
  const [specificFields, setSpecificFields] = useState(
    detailsConfig.initialFields || {}
  );

  // Funciones para manejar campos específicos
  const updateField = (fieldName, value) => {
    setSpecificFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  // Cargar pedido inicial
  useEffect(() => {
    // Indicar que estamos en modo edición para optimizar actualizaciones
    setCartContext('edit');

    // Buscar pedido por número
    const foundOrder = orders.find((o) => o.orderNumber === parseInt(orderNumber, 10));
    
    // Evitar actualización si el pedido ya está cargado con el mismo ID
    if (editingOrder?._id === foundOrder?._id) {
      return;
    }
    
    setEditingOrder(foundOrder || null);

    if (foundOrder) {
      // Transformar pedido a formato de carrito (una sola vez)
      const cartItems = foundOrder.foods.map((item) => ({
        _id: item.food._id,
        title: item.food.title,
        quantity: item.quantity,
        price: item.food.price,
        comment: item.comment || '',
      }));
      
      // Actualizar el carrito de una vez, sin provocar actualizaciones parciales
      setCart(cartItems);

      // Cargar datos básicos comunes
      setCustomerName(foundOrder.buyer?.name || foundOrder.name || '');
      setSelectedPaymentMethod(foundOrder.payment || 'Efectivo');
      setComment(foundOrder.comment || '');
      
      // Determinar si es un pedido completado/enviado
      const isCompleted = detailsConfig.checkCompletedStatus(foundOrder);
      setIsViewingCompletedOrder(isCompleted);
      
      // Cargar campos específicos para este tipo de pedido
      if (detailsConfig.loadSpecificFields) {
        const specificData = detailsConfig.loadSpecificFields(foundOrder);
        setSpecificFields(specificData);
      }
    }
  }, [orderNumber, orders, setCart, setCartContext, detailsConfig, editingOrder]);
  // Seleccionar un pedido completado para ver sus detalles
  const handleSelectCompletedOrder = (order) => {
    // Evitar actualización si el pedido ya está seleccionado
    if (selectedOrderId === order._id) {
      return;
    }
    
    // Establecer que estamos en modo edición antes de actualizar el carrito
    setCartContext('edit');
    
    setEditingOrder(order);
    setSelectedOrderId(order._id);
    
    // Cargar datos básicos
    setCustomerName(order.buyer?.name || order.name || '');
    setSelectedPaymentMethod(order.payment || 'Efectivo');
    setComment(order.comment || order.buyer?.comment || '');
    
    // Transformar pedido a formato de carrito (preparar datos antes de actualizar state)
    const cartItems = order.foods.map((item) => ({
      _id: item.food._id,
      title: item.food.title,
      quantity: item.quantity,
      price: item.food.price,
      comment: item.comment || '',
    }));
    
    // Establecer estado de visualización antes de actualizar el carrito
    setIsViewingCompletedOrder(true);
    
    // Cargar campos específicos para este tipo
    if (detailsConfig.loadSpecificFields) {
      const specificData = detailsConfig.loadSpecificFields(order);
      setSpecificFields(specificData);
    }
    
    // Actualizar el carrito como última operación para reducir renders
    setCart(cartItems);
    
    // Navegar a la URL del pedido seleccionado
    navigate(`/${section}/${order.orderNumber}`);
  };

  // Enviar actualización de pedido
  const handleSubmit = async (e, resetForm, status = 'Preparacion', sectionName = section) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isViewingCompletedOrder) return;

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

  // Filtrar pedidos según su estado
  const preparationOrders = orders.filter(
    (order) => order.section === section && order.status === 'Preparacion'
  );
  
  // Personalizar el filtro para completados según tipo
  const completedOrdersFilter = detailsConfig.completedOrdersFilter || 
    ((order) => order.section === section && 
               (order.status === 'Completado' || order.status === 'Cancelado'));
               
  const completedOrders = orders.filter(completedOrdersFilter);

  return {
    // Estados base
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
    
    // Estados específicos
    specificFields,
    updateField,
    
    // Métodos
    handleSelectCompletedOrder,
    handleSubmit,
    
    // Listas filtradas
    preparationOrders,
    completedOrders,
  };
};