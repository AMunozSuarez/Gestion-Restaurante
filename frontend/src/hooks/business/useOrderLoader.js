import { useState, useEffect, useRef } from 'react';
import useCartStore from '../../store/useCartStore';
import { useOrders } from '../api/useOrders';

/**
 * Hook para cargar y preparar datos de un pedido
 * @param {Object} options - Opciones de configuración
 * @param {string|number} options.orderNumber - Número del pedido a cargar
 * @param {Object} options.config - Configuración para personalizar la carga
 * @param {Function} options.config.checkCompletedStatus - Función para determinar si un pedido está completado
 * @param {Function} options.config.loadSpecificFields - Función para cargar campos específicos del tipo de pedido
 * @param {Object} options.config.initialFields - Valores iniciales para campos específicos
 * @returns {Object} Datos del pedido y estados relacionados
 */
export const useOrderLoader = ({ 
  orderNumber, 
  config = {} 
}) => {
  const { orders } = useOrders();
  const { setCart, setCartContext } = useCartStore();
  
  // Estados para el pedido
  const [loadedOrder, setLoadedOrder] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
  const [comment, setComment] = useState('');
  const [isCompletedOrder, setIsCompletedOrder] = useState(false);
  const [specificFields, setSpecificFields] = useState(config.initialFields || {});
  
  // Referencia para evitar ciclos de carga
  const processingOrderRef = useRef(null);
  const previousOrderIdRef = useRef(null);

  // Función para actualizar campos específicos
  const updateField = (fieldName, value) => {
    setSpecificFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Efecto para cargar el pedido cuando cambia el orderNumber
  useEffect(() => {
    
    // Configurar contexto del carrito
    // setCartContext('edit');


    // Si ya estamos procesando este pedido, evitar ciclo
    if (processingOrderRef.current === orderNumber) {
      return;
    }
    
    // Marcar procesamiento
    processingOrderRef.current = orderNumber;
    
    
    // Buscar pedido por número
    const foundOrder = orders.find((o) => o.orderNumber === parseInt(orderNumber, 10));
    
    // Evitar actualización si el pedido ya está cargado con el mismo ID
    if (previousOrderIdRef.current === foundOrder?._id) {
      return;
    }
    
    // Actualizar referencia del ID
    previousOrderIdRef.current = foundOrder?._id;
    
    // Actualizar pedido cargado
    setLoadedOrder(foundOrder || null);

    console.log('useEffect de useOrderLoader que se ejecuta al cargar el pedido:',);

    if (foundOrder) {
      // Transformar productos a formato de carrito
      const cartItems = foundOrder.foods.map((item) => ({
        _id: item.food._id,
        title: item.food.title,
        quantity: item.quantity,
        price: item.food.price,
        comment: item.comment || '',
      }));
      
      // Actualizar carrito
      setCart(cartItems);

      // Cargar datos básicos
      setCustomerName(foundOrder.buyer?.name || foundOrder.name || '');
      setSelectedPaymentMethod(foundOrder.payment || 'Efectivo');
      setComment(foundOrder.comment || foundOrder.buyer?.comment || '');
      
      // Determinar si es un pedido completado
      if (config.checkCompletedStatus) {
        setIsCompletedOrder(config.checkCompletedStatus(foundOrder));
      }
      
      // Cargar campos específicos
      if (config.loadSpecificFields) {
        const specificData = config.loadSpecificFields(foundOrder);
        setSpecificFields(specificData);
      }
    }

    // Limpiar referencia al desmontar
    return () => {
      if (processingOrderRef.current === orderNumber) {
        processingOrderRef.current = null;
      }
    };
  }, [orderNumber, orders, setCart, config]);

  return {
    // Estados
    loadedOrder,
    customerName,
    setCustomerName,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    comment,
    setComment,
    isCompletedOrder,
    specificFields,
    updateField,
    
    // Método para forzar una recarga del pedido
    reloadOrder: () => {
      previousOrderIdRef.current = null;
      processingOrderRef.current = null;
    }
  };
};