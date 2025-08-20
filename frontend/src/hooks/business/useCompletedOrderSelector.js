import { useNavigate } from 'react-router-dom';
import useCartStore from '../../store/useCartStore';

/**
 * Hook especializado para la selección de pedidos completados
 */
export const useCompletedOrderSelector = () => {
  const navigate = useNavigate();
  const { setCart, setCartContext } = useCartStore();

  /**
   * Selecciona un pedido completado y prepara la UI para visualizarlo
   * @param {Object} order - Pedido completado a seleccionar
   * @param {Object} options - Opciones de configuración
   * @returns {Object} El pedido seleccionado
   */
  const selectCompletedOrder = (order, options = {}) => {
    const {
      section,
      setCustomerName,
      setSelectedPaymentMethod,
      setComment,
      updateField
    } = options;
    
    // Establecer modo edición
    setCartContext('edit');
    
    // Transformar pedido a formato de carrito
    const cartItems = order.foods.map((item) => ({
      _id: item.food._id,
      title: item.food.title,
      quantity: item.quantity,
      price: item.food.price,
      comment: item.comment || '',
    }));
    
    // Actualizar carrito
    setCart(cartItems);

    // Actualizar estados si se proporcionaron setters
    if (setCustomerName) {
      setCustomerName(order.buyer?.name || order.name || '');
    }
    
    if (setSelectedPaymentMethod) {
      setSelectedPaymentMethod(order.payment || 'Efectivo');
    }
    
    if (setComment) {
      setComment(order.comment || order.buyer?.comment || '');
    }
    
    // Cargar campos específicos si se proporcionó una función
    if (options.loadSpecificFields && updateField) {
      const specificData = options.loadSpecificFields(order);
      
      // Actualizar cada campo específico
      Object.entries(specificData).forEach(([field, value]) => {
        updateField(field, value);
      });
    }
    
    // Navegar si se proporcionó una sección
    if (section) {
      navigate(`/${section}/${order.orderNumber}`);
    }
    
    return order;
  };
  
  return {
    selectCompletedOrder
  };
};