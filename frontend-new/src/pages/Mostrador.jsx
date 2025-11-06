import React from 'react';
import { Button } from '../components/ui';
import { PlusIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useOrders, useRecentOrders } from '../hooks/useOrders';
import { useProducts, useProductSearch } from '../hooks/useProducts';
import { useCashRegister } from '../hooks/useCashRegister';
import CashRegisterAlert from '../components/common/CashRegisterAlert';
import ProductModal from '../components/common/ProductModal';

const Mostrador = () => {
  // Estado para crear pedido
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [showCashAlert, setShowCashAlert] = React.useState(false);
  const [showProductModal, setShowProductModal] = React.useState(false);
  
  // Estados del formulario de pedido
  const [customerName, setCustomerName] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState([]);
  const [addedProductNotification, setAddedProductNotification] = React.useState(null);
  const [commentingProduct, setCommentingProduct] = React.useState(null);
  const [productComment, setProductComment] = React.useState('');
  const [isCreatingOrderRequest, setIsCreatingOrderRequest] = React.useState(false);

  // Estados para editar pedido
  const [isEditingOrder, setIsEditingOrder] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [editCustomerName, setEditCustomerName] = React.useState('');
  const [editComments, setEditComments] = React.useState('');
  const [editPaymentMethod, setEditPaymentMethod] = React.useState('');
  const [editSearchTerm, setEditSearchTerm] = React.useState('');
  const [editCart, setEditCart] = React.useState([]);
  const [editCommentingProduct, setEditCommentingProduct] = React.useState(null);
  const [editProductComment, setEditProductComment] = React.useState('');
  const [isUpdatingOrderRequest, setIsUpdatingOrderRequest] = React.useState(false);

  // Estados para ver detalle de pedidos completados/cancelados
  const [isViewingCompletedOrder, setIsViewingCompletedOrder] = React.useState(false);
  const [selectedCompletedOrder, setSelectedCompletedOrder] = React.useState(null);
  
  // Hook para caja registradora
  const { 
    isOpen: isCashOpen, 
    isLoading: cashLoading, 
    openCashRegister,
    addOrderToCashRegister 
  } = useCashRegister();
  
  // Hooks para productos
  const { products, isLoading: productsLoading } = useProducts({ available: true });
  const { searchResults, isSearching, searchProducts } = useProductSearch();
  
  // Hooks para obtener datos reales
  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError,
    updateOrderStatus,
    createOrder,
    updateOrder,
    refetch: refetchOrders
  } = useOrders({ 
    section: 'mostrador', 
    status: 'Preparacion' 
  });

  const { 
    orders: completedOrders, 
    isLoading: completedLoading,
    refetch: refetchCompletedOrders 
  } = useRecentOrders({ 
    limit: 10, 
    status: 'Completado,Cancelado', 
    section: 'mostrador', 
    sortBy: 'updatedAt' 
  });

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función helper para obtener el nombre del cliente
  const getCustomerName = (order) => {
    // Priorizar buyer.name, luego name, luego customerName, luego fallback
    return order.buyer?.name || order.name || order.customerName || 'Cliente';
  };

  // Función helper para obtener el teléfono del cliente
  const getCustomerPhone = (order) => {
    // Priorizar buyer.phone, luego phone, luego fallback vacío
    return order.buyer?.phone || order.phone || '';
  };

  // Funciones para manejo del carrito
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        // Mostrar notificación de cantidad actualizada
        setAddedProductNotification(`${product.name} - Cantidad actualizada`);
        setTimeout(() => setAddedProductNotification(null), 2000);
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      // Mostrar notificación de producto agregado
      setAddedProductNotification(`${product.name} agregado al carrito`);
      setTimeout(() => setAddedProductNotification(null), 2000);
      
      return [...prevCart, { ...product, quantity: 1, comments: '' }];
    });
  };

  // Funciones para edición - manejo del carrito de edición
  const addToEditCart = (product) => {
    setEditCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        // Mostrar notificación de cantidad actualizada
        setAddedProductNotification(`${product.name} - Cantidad actualizada`);
        setTimeout(() => setAddedProductNotification(null), 2000);
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      // Mostrar notificación de producto agregado
      setAddedProductNotification(`${product.name} agregado al carrito`);
      setTimeout(() => setAddedProductNotification(null), 2000);
      
      return [...prevCart, { ...product, quantity: 1, comments: '' }];
    });
  };

  // Función para agregar comentarios a productos en el carrito
  const addCommentToProduct = (productId, comment) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, comments: comment }
          : item
      )
    );
  };

  // Función para agregar comentarios a productos en el carrito de edición
  const addCommentToEditProduct = (productId, comment) => {
    setEditCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, comments: comment }
          : item
      )
    );
  };

  const openCommentModal = (product) => {
    setCommentingProduct(product);
    setProductComment(product.comments || '');
  };

  const openEditCommentModal = (product) => {
    setEditCommentingProduct(product);
    setEditProductComment(product.comments || '');
  };

  const saveComment = () => {
    if (commentingProduct) {
      addCommentToProduct(commentingProduct.id, productComment);
      setCommentingProduct(null);
      setProductComment('');
    }
  };

  const saveEditComment = () => {
    if (editCommentingProduct) {
      addCommentToEditProduct(editCommentingProduct.id, editProductComment);
      setEditCommentingProduct(null);
      setEditProductComment('');
    }
  };

  const cancelComment = () => {
    setCommentingProduct(null);
    setProductComment('');
  };

  const cancelEditComment = () => {
    setEditCommentingProduct(null);
    setEditProductComment('');
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const removeFromEditCart = (productId) => {
    setEditCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const updateEditQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromEditCart(productId);
      return;
    }
    setEditCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateEditTotal = () => {
    return editCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Funciones para búsqueda de productos
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      searchProducts(value);
    }
  };

  const handleEditSearchChange = (e) => {
    const value = e.target.value;
    setEditSearchTerm(value);
    if (value.trim()) {
      searchProducts(value);
    }
  };

  const clearForm = () => {
    setCustomerName('');
    setComments('');
    setPaymentMethod('');
    setSearchTerm('');
    setCart([]);
    setCommentingProduct(null);
    setProductComment('');
    setIsCreatingOrderRequest(false);
  };

  const clearEditForm = () => {
    setEditCustomerName('');
    setEditComments('');
    setEditPaymentMethod('');
    setEditSearchTerm('');
    setEditCart([]);
    setEditCommentingProduct(null);
    setEditProductComment('');
    setIsUpdatingOrderRequest(false);
  };

  const handleCancelNewOrder = () => {
    setIsCreatingOrder(false);
    clearForm();
  };

  const handleCancelEditOrder = () => {
    setIsEditingOrder(false);
    setSelectedOrder(null);
    clearEditForm();
  };

  // Función para seleccionar pedido completado/cancelado para ver detalle
  const handleSelectCompletedOrder = (order) => {
    console.log('Pedido completado seleccionado:', order); // Debug log
    setSelectedCompletedOrder(order);
    setIsViewingCompletedOrder(true);
    
    // Cerrar la vista de crear pedido sin limpiar estados
    if (isCreatingOrder) {
      setIsCreatingOrder(false);
    }
    
    // Si hay un pedido en edición, cerrarlo
    if (isEditingOrder) {
      setIsEditingOrder(false);
      setSelectedOrder(null);
      clearEditForm();
    }
  };

  const handleCancelViewCompletedOrder = () => {
    setIsViewingCompletedOrder(false);
    setSelectedCompletedOrder(null);
  };

  // Función para seleccionar pedido para editar
  const handleSelectOrderToEdit = (order) => {
    console.log('Pedido seleccionado:', order); // Debug log
    setSelectedOrder(order);
    setIsEditingOrder(true);
    
    // Cerrar la vista de crear pedido sin limpiar estados
    if (isCreatingOrder) {
      setIsCreatingOrder(false);
    }
    
    // Si hay un pedido completado en vista, cerrarlo
    if (isViewingCompletedOrder) {
      setIsViewingCompletedOrder(false);
      setSelectedCompletedOrder(null);
    }
    
    // Cargar datos del pedido en el formulario de edición
    setEditCustomerName(getCustomerName(order));
    setEditComments(order.comment || '');
    setEditPaymentMethod(order.payment || '');
    
    // Cargar productos del pedido en el carrito de edición
    const orderProducts = order.foods?.map(food => {
      console.log('Procesando food:', food); // Debug log
      
      // Determinar el ID del producto
      let productId;
      if (typeof food.food === 'string') {
        // Si food.food es un string, es el ID
        productId = food.food;
      } else if (food.food && typeof food.food === 'object') {
        // Si food.food es un objeto, obtener su _id o id
        productId = food.food._id || food.food.id;
      } else {
        console.warn('Estructura de food inesperada:', food);
        productId = food.food;
      }
      
      console.log('ID del producto extraído:', productId);
      
      return {
        id: productId,
        name: food.food?.title || 'Producto',
        price: food.food?.price || 0,
        quantity: food.quantity || 1,
        comments: food.comment || '',
        category: food.food?.category
      };
    }) || [];
    
    console.log('Productos cargados en editCart:', orderProducts);
    setEditCart(orderProducts);
  };

  // Función para crear el pedido
  const handleCreateOrder = async () => {
    if (isCreatingOrderRequest) return; // Prevenir clicks múltiples
    
    // Verificar si la caja está abierta
    if (!isCashOpen) {
      setShowCashAlert(true);
      return;
    }
    
    try {
      setIsCreatingOrderRequest(true);
      
      // Preparar los datos del pedido
      const orderData = {
        foods: cart.map(item => ({
          food: item.id,
          quantity: item.quantity,
          comment: item.comments || ''
        })),
        payment: paymentMethod,
        buyer: {
          name: customerName,
          phone: '', // En mostrador no necesariamente hay teléfono
        },
        section: 'mostrador',
        status: 'Preparacion',
        comment: comments
      };

      console.log('Creando pedido:', orderData);
      
      const response = await createOrder(orderData);
      
      if (response.success) {
        // Mostrar notificación de éxito
        setAddedProductNotification(`Pedido #${response.order?.orderNumber || 'N/A'} creado exitosamente`);
        setTimeout(() => setAddedProductNotification(null), 3000);
        
        // Limpiar formulario y cerrar
        clearForm();
        setIsCreatingOrder(false);
        
        // El estado ya se actualiza automáticamente en el hook useOrders
        // No necesitamos refetchOrders() aquí
      } else {
        alert('Error al crear el pedido: ' + (response.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear el pedido: ' + error.message);
    } finally {
      setIsCreatingOrderRequest(false);
    }
  };

  // Función para actualizar el pedido
  const handleUpdateOrder = async () => {
    if (isUpdatingOrderRequest || !selectedOrder) return;
    
    try {
      setIsUpdatingOrderRequest(true);
      
      // Preparar los datos del pedido actualizado
      const orderData = {
        foods: editCart.map(item => {
          console.log('Enviando item al backend:', item);
          return {
            food: item.id,
            quantity: item.quantity,
            comment: item.comments || ''
          };
        }),
        payment: editPaymentMethod,
        buyer: {
          name: editCustomerName,
          phone: getCustomerPhone(selectedOrder),
        },
        section: 'mostrador',
        status: selectedOrder.status,
        comment: editComments
      };

      console.log('Datos completos a enviar:', orderData);
      console.log('Foods a enviar:', orderData.foods);
      
      // Validar que todos los productos tengan IDs válidos
      const invalidFoods = orderData.foods.filter(food => !food.food || typeof food.food !== 'string');
      if (invalidFoods.length > 0) {
        console.error('Productos con IDs inválidos:', invalidFoods);
        throw new Error('Algunos productos no tienen IDs válidos');
      }

      console.log('Actualizando pedido:', orderData);
      
      // Obtener el ID correcto del pedido
      const orderId = selectedOrder._id || selectedOrder.id;
      console.log('ID del pedido a actualizar:', orderId);
      
      if (!orderId) {
        throw new Error('ID del pedido no válido');
      }
      
      // Llamar a la función updateOrder del hook
      const response = await updateOrder(orderId, orderData);
      
      if (response.success) {
        // Mostrar notificación de éxito
        setAddedProductNotification(`Pedido #${selectedOrder.orderNumber} actualizado exitosamente`);
        setTimeout(() => setAddedProductNotification(null), 3000);
        
        // Limpiar formulario y cerrar
        clearEditForm();
        setIsEditingOrder(false);
        setSelectedOrder(null);
        
        // El estado ya se actualiza automáticamente en el hook useOrders
        // No necesitamos refetchOrders() aquí
      } else {
        alert('Error al actualizar el pedido: ' + (response.error || 'Error desconocido'));
      }
      
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar el pedido: ' + error.message);
    } finally {
      setIsUpdatingOrderRequest(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    console.log('Completando pedido con ID:', orderId); // Debug log
    if (!orderId) {
      alert('Error: ID del pedido no válido');
      return;
    }
    
    // Validaciones simples
    if (!editCart || editCart.length === 0) {
      alert('⚠️ Debe agregar al menos un producto al pedido');
      return;
    }
    
    if (!editPaymentMethod || editPaymentMethod.trim() === '') {
      alert('⚠️ Debe seleccionar un método de pago');
      return;
    }
    
    // Preparar los datos del pedido actualizado antes de completar
    const orderData = {
      foods: editCart.map(item => ({
        food: item.id,
        quantity: item.quantity,
        comment: item.comments || ''
      })),
      payment: editPaymentMethod,
      buyer: {
        name: editCustomerName,
        phone: getCustomerPhone(selectedOrder),
      },
      section: 'mostrador',
      status: 'Completado', // Cambiar directamente a completado
      comment: editComments
    };

    try {
      // Actualizar el pedido con estado completado en una sola operación
      const orderId = selectedOrder._id || selectedOrder.id;
      const response = await updateOrder(orderId, orderData);
      
      if (!response.success) {
        alert('Error al completar el pedido: ' + (response.error || 'Error desconocido'));
        return;
      }

      console.log('Pedido completado exitosamente');
      
      // Agregar pedido a la caja registradora si hay una caja abierta
      if (isCashOpen) {
        try {
          const total = calculateEditTotal();
          const orderData = {
            orderId: orderId,
            total: total,
            paymentMethod: editPaymentMethod,
            items: editCart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              comment: item.comment || ''
            }))
          };
          
          const cashResult = await addOrderToCashRegister(orderData);
          if (cashResult.success) {
            console.log('Pedido agregado a la caja registradora exitosamente');
          } else {
            console.error('Error al agregar pedido a la caja:', cashResult.error);
            setAddedProductNotification('Advertencia: No se pudo agregar el pedido a la caja registradora');
            setTimeout(() => setAddedProductNotification(null), 4000);
          }
        } catch (error) {
          console.error('Error al agregar pedido a la caja registradora:', error);
          setAddedProductNotification('Advertencia: No se pudo agregar el pedido a la caja registradora');
          setTimeout(() => setAddedProductNotification(null), 4000);
        }
      }
      
      // Mostrar notificación de éxito
      setAddedProductNotification('Pedido completado exitosamente');
      setTimeout(() => setAddedProductNotification(null), 2000);
      
      // Cerrar la edición si el pedido se completó exitosamente
      setIsEditingOrder(false);
      setSelectedOrder(null);
      clearEditForm();
      
      // Solo actualizar la lista de pedidos completados (los pedidos en preparación se actualizan automáticamente)
      refetchCompletedOrders();
    } catch (error) {
      console.error('Error al completar el pedido:', error);
      alert('Error al completar el pedido: ' + error.message);
    }
  };

  const handleCancelOrder = async (orderId) => {
    console.log('Cancelando pedido con ID:', orderId); // Debug log
    if (!orderId) {
      alert('Error: ID del pedido no válido');
      return;
    }
    
    const result = await updateOrderStatus(orderId, 'Cancelado');
    if (!result.success) {
      alert('Error al cancelar el pedido: ' + result.error);
    } else {
      // Mostrar notificación de éxito
      setAddedProductNotification('Pedido cancelado exitosamente');
      setTimeout(() => setAddedProductNotification(null), 2000);
      
      // Cerrar la edición si el pedido se canceló exitosamente
      setIsEditingOrder(false);
      setSelectedOrder(null);
      clearEditForm();
      
      // Solo actualizar la lista de pedidos completados (los pedidos en preparación se actualizan automáticamente)
      refetchCompletedOrders();
    }
  };

  // Mostrar alerta de caja si no está abierta
  React.useEffect(() => {
    if (!cashLoading && !isCashOpen) {
      setShowCashAlert(true);
    }
  }, [cashLoading, isCashOpen]);

  const handleOpenCash = async (initialAmount) => {
    const result = await openCashRegister(initialAmount);
    if (result.success) {
      setShowCashAlert(false);
    }
    return result;
  };

  // Mostrar loading si está cargando la caja o los pedidos
  if (cashLoading || (ordersLoading && isCashOpen)) {
    return (
      <div className="h-full flex items-center justify-center bg-professional">
        <div className="text-center card-professional p-12">
          <div className="loading-professional mx-auto mb-6"></div>
          <p className="text-professional-body">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay algún error
  if (ordersError) {
    return (
      <div className="h-full flex items-center justify-center bg-professional">
        <div className="text-center card-professional p-12 border-red-200">
          <p className="text-red-600 mb-6 font-medium">Error al cargar pedidos: {ordersError}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="btn-professional-primary"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full bg-professional flex flex-col gap-4 p-4 overflow-hidden">
        {/* Header con botón crear pedido */}
        <div className={`flex justify-between items-center flex-shrink-0 ${
          !isCreatingOrder && !isEditingOrder && !isViewingCompletedOrder 
            ? 'max-w-6xl mx-auto w-full' 
            : ''
        }`}>
          <h1 className="text-professional-title">Mostrador</h1>
          <Button
            onClick={() => {
              if (isCreatingOrder) {
                handleCancelNewOrder();
              } else {
                // Cerrar cualquier vista activa antes de crear nuevo pedido
                if (isEditingOrder) {
                  setIsEditingOrder(false);
                  setSelectedOrder(null);
                  clearEditForm();
                }
                if (isViewingCompletedOrder) {
                  setIsViewingCompletedOrder(false);
                  setSelectedCompletedOrder(null);
                }
                setIsCreatingOrder(true);
              }
            }}
            className="btn-professional-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            {isCreatingOrder ? 'Cancelar' : 'Crear Pedido'}
          </Button>
        </div>

        {/* Contenido principal con altura fija */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Columna izquierda - Formulario de creación (cuando está activo) */}
        {isCreatingOrder && (
          <div className="w-[480px] flex-shrink-0">
            <div className="h-full flex flex-col card-professional p-4">
              <h2 className="text-professional-subtitle mb-3 flex-shrink-0">Creando Nuevo Pedido</h2>
              
              {/* Formulario temporal con scroll independiente */}
              <div className="flex-1 min-h-0">
                <div className="h-full space-y-3 scrollbar-professional overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      className="input-professional"
                      placeholder="Ingrese el nombre del cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Comentario
                    </label>
                    <textarea
                      className="input-professional resize-none"
                      rows="2"
                      placeholder="Comentarios adicionales"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Buscar Productos
                    </label>
                    <input
                      type="text"
                      className="input-professional mb-2"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    {/* Resultados de búsqueda */}
                    {searchTerm && searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md mb-2">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addToCart(product);
                              setSearchTerm('');
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">{product.name}</span>
                                <div className="text-xs text-gray-500">{product.category?.title || product.category?.name || 'Sin categoría'}</div>
                              </div>
                              <span className="text-sm font-semibold text-orange-600">
                                ${product.price?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      className="w-full btn-professional-outline"
                      onClick={() => setShowProductModal(true)}
                    >
                      Ver Productos
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Carrito ({cart.length} items)
                    </label>
                    <div className={`product-list ${cart.length === 0 ? 'min-h-[80px] max-h-[80px]' : 'min-h-[150px] max-h-[200px]'} overflow-y-auto`}>
                      {cart.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-professional-body text-center text-sm">El carrito está vacío</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item) => (
                            <div key={item.id} className="bg-gray-50 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className="text-xs text-gray-500">
                                    ${item.price?.toFixed(2)} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs"
                                  >
                                    <TrashIcon className="w-3 h-3 mx-auto" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Comentarios del producto */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openCommentModal(item)}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4.707 4.707z" />
                                  </svg>
                                  {item.comments ? 'Editar' : 'Agregar'} comentario
                                </button>
                                {item.comments && (
                                  <div className="flex-1 text-xs text-gray-600 italic">
                                    "{item.comments}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Método de Pago
                    </label>
                    <select 
                      className="input-professional"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="">Seleccionar método</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Debito">Débito</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div className="total-highlight">
                    <div className="flex justify-between text-lg">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botón al final del scroll */}
                  <div className="pt-3">
                    <button 
                      className="w-full btn-professional-primary"
                      onClick={handleCreateOrder}
                    >
                      {isCreatingOrderRequest ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creando...
                        </div>
                      ) : (
                        'Crear Pedido'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Columna derecha - Lista de pedidos con altura controlada */}
        <div className={`${
          isCreatingOrder ? 'flex-1' : 
          (isEditingOrder || isViewingCompletedOrder) ? 'flex-1' : 
          'w-full max-w-6xl mx-auto'
        } flex flex-col gap-3 min-h-0`}>
          {/* Pedidos en preparación - 60% de la altura */}
          <div className="flex-[60] min-h-0">
            <div className="h-full flex flex-col card-professional p-4">
              <h2 className="text-professional-subtitle mb-3 flex-shrink-0 flex items-center gap-3">
                <ClockIcon className="w-6 h-6 text-orange-600" />
                Pedidos en Preparación
              </h2>
              
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Encabezado de la tabla - fijo */}
                <div className="table-header-professional grid grid-cols-6 gap-3 mb-2 flex-shrink-0 px-2">
                  <div className="text-center font-semibold text-sm">#</div>
                  <div className="text-center font-semibold text-sm">Fecha/Hora</div>
                  <div className="text-center font-semibold text-sm">Tiempo</div>
                  <div className="text-center font-semibold text-sm">Cliente</div>
                  <div className="text-center font-semibold text-sm">Estado</div>
                  <div className="text-center font-semibold text-sm">Total</div>
                </div>
                
                {/* Lista de pedidos con scroll independiente */}
                <div className="flex-1 overflow-y-auto scrollbar-professional space-y-1 pr-1">
                  {orders.map((order, index) => (
                    <div 
                      key={order._id || order.id} 
                      className={`grid grid-cols-6 gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                        (selectedOrder?._id || selectedOrder?.id) === (order._id || order.id)
                          ? 'bg-yellow-100 shadow-md border-yellow-300' 
                          : 'bg-yellow-50 hover:bg-yellow-100'
                      }`}
                      onClick={() => handleSelectOrderToEdit(order)}
                    >
                      <div className="text-center font-semibold text-gray-800 text-sm">
                        {order.orderNumber}
                      </div>
                      <div className="text-center text-xs text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}, {formatTime(order.createdAt)}
                      </div>
                      <div className="text-center">
                        <span className="text-orange-500 font-medium text-xs">
                          {Math.max(0, Math.floor((new Date() - new Date(order.createdAt)) / 60000))} min
                        </span>
                      </div>
                      <div className="text-center text-gray-800 font-medium text-sm truncate">
                        {getCustomerName(order)}
                      </div>
                      <div className="text-center">
                        <span className="status-preparing text-xs">
                          Preparación
                        </span>
                      </div>
                      <div className="text-center font-semibold text-gray-800 text-sm">
                        ${order.total.toFixed(3)}
                      </div>
                    </div>
                  ))}
                  
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay pedidos en preparación
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pedidos completados recientes - 40% de la altura */}
          <div className="flex-[40] min-h-0">
            <div className="h-full flex flex-col card-professional p-4">
              <h2 className="text-professional-subtitle mb-3 flex-shrink-0">
                Pedidos Completados/Cancelados
              </h2>
              
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Encabezado de la tabla - fijo */}
                <div className="bg-green-700 text-white grid grid-cols-5 gap-3 p-2 rounded-t-lg mb-1 flex-shrink-0">
                  <div className="text-center font-semibold text-xs">#</div>
                  <div className="text-center font-semibold text-xs">Fecha/Hora</div>
                  <div className="text-center font-semibold text-xs">Cliente</div>
                  <div className="text-center font-semibold text-xs">Estado</div>
                  <div className="text-center font-semibold text-xs">Total</div>
                </div>
                
                {/* Lista de pedidos completados con scroll independiente */}
                <div className="flex-1 overflow-y-auto scrollbar-professional space-y-1 pr-1">
                  {completedOrders.map((order, index) => (
                    <div 
                      key={order.id} 
                      className={`grid grid-cols-5 gap-3 p-2 rounded transition-colors cursor-pointer ${
                        (selectedCompletedOrder?._id || selectedCompletedOrder?.id) === (order._id || order.id)
                          ? (order.status === 'Completado' ? 'bg-green-200 border-green-400' : 'bg-red-200 border-red-400')
                          : (order.status === 'Completado' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100')
                      } border-l-4 ${
                        (selectedCompletedOrder?._id || selectedCompletedOrder?.id) === (order._id || order.id)
                          ? (order.status === 'Completado' ? 'border-green-500' : 'border-red-500')
                          : (order.status === 'Completado' ? 'border-green-500' : 'border-red-500')
                      }`}
                      onClick={() => handleSelectCompletedOrder(order)}
                    >
                      <div className="text-center font-medium text-gray-800 text-sm">
                        #{order.orderNumber}
                      </div>
                      <div className="text-center text-xs text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit'
                        })}, {formatTime(order.createdAt)}
                      </div>
                      <div className="text-center text-xs text-gray-800 font-medium truncate">
                        {getCustomerName(order)?.toUpperCase()}
                      </div>
                      <div className="text-center">
                        <span className={order.status === 'Completado' ? 'status-completed text-xs' : 'bg-red-100 border-red-300 text-red-600 rounded-full px-1 py-0.5 text-xs font-medium'}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-center font-semibold text-gray-800 text-xs">
                        ${order.total.toFixed(3)}
                      </div>
                    </div>
                  ))}
                  
                  {completedOrders.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No hay pedidos completados recientes
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna de edición - Formulario de edición (cuando está activo) */}
        {isEditingOrder && selectedOrder && (
          <div className="w-[480px] flex-shrink-0">
            <div className="h-full flex flex-col card-professional p-4">
              <h2 className="text-professional-subtitle mb-3 flex-shrink-0 flex items-center justify-between">
                <span>Editando Pedido #{selectedOrder.orderNumber}</span>
                <button
                  onClick={handleCancelEditOrder}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Cerrar
                </button>
              </h2>
              
              {/* Formulario de edición con scroll independiente */}
              <div className="flex-1 min-h-0">
                <div className="h-full space-y-3 scrollbar-professional overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      className="input-professional"
                      placeholder="Ingrese el nombre del cliente"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Comentario
                    </label>
                    <textarea
                      className="input-professional resize-none"
                      rows="2"
                      placeholder="Comentarios adicionales"
                      value={editComments}
                      onChange={(e) => setEditComments(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Buscar Productos
                    </label>
                    <input
                      type="text"
                      className="input-professional mb-2"
                      placeholder="Buscar productos..."
                      value={editSearchTerm}
                      onChange={handleEditSearchChange}
                    />
                    {/* Resultados de búsqueda para edición */}
                    {editSearchTerm && searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md mb-2">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addToEditCart(product);
                              setEditSearchTerm('');
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">{product.name}</span>
                                <div className="text-xs text-gray-500">{product.category?.title || product.category?.name || 'Sin categoría'}</div>
                              </div>
                              <span className="text-sm font-semibold text-orange-600">
                                ${product.price?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      className="w-full btn-professional-outline"
                      onClick={() => setShowProductModal(true)}
                    >
                      Ver Productos
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Carrito ({editCart.length} items)
                    </label>
                    <div className={`product-list ${editCart.length === 0 ? 'min-h-[80px] max-h-[80px]' : 'min-h-[150px] max-h-[200px]'} overflow-y-auto`}>
                      {editCart.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-professional-body text-center text-sm">El carrito está vacío</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editCart.map((item) => (
                            <div key={item.id} className="bg-gray-50 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className="text-xs text-gray-500">
                                    ${item.price?.toFixed(2)} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateEditQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <button
                                    onClick={() => updateEditQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => removeFromEditCart(item.id)}
                                    className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs"
                                  >
                                    <TrashIcon className="w-3 h-3 mx-auto" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Comentarios del producto */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditCommentModal(item)}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4.707 4.707z" />
                                  </svg>
                                  {item.comments ? 'Editar' : 'Agregar'} comentario
                                </button>
                                {item.comments && (
                                  <div className="flex-1 text-xs text-gray-600 italic">
                                    "{item.comments}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Método de Pago
                    </label>
                    <select 
                      className="input-professional"
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                    >
                      <option value="">Seleccionar método</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Debito">Débito</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div className="total-highlight">
                    <div className="flex justify-between text-lg">
                      <span>Total:</span>
                      <span>${calculateEditTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botones al final del scroll */}
                  <div className="pt-3 space-y-2">
                    <button 
                      className="w-full btn-professional-primary"
                      disabled={editCart.length === 0 || isUpdatingOrderRequest}
                      onClick={handleUpdateOrder}
                    >
                      {isUpdatingOrderRequest ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Actualizando...
                        </div>
                      ) : (
                        'Actualizar Pedido'
                      )}
                    </button>
                    
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors text-sm"
                        onClick={() => handleCompleteOrder(selectedOrder._id || selectedOrder.id)}
                      >
                        Completar
                      </button>
                      <button 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors text-sm"
                        onClick={() => handleCancelOrder(selectedOrder._id || selectedOrder.id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Columna de vista - Detalle de pedidos completados/cancelados (solo lectura) */}
        {isViewingCompletedOrder && selectedCompletedOrder && (
          <div className="w-[480px] flex-shrink-0">
            <div className="h-full flex flex-col card-professional p-4 bg-gray-50 border border-gray-300">
              <h2 className="text-professional-subtitle mb-3 flex-shrink-0 flex items-center justify-between">
                <span className="text-gray-700">
                  Detalle Pedido #{selectedCompletedOrder.orderNumber} 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    selectedCompletedOrder.status === 'Completado' 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {selectedCompletedOrder.status}
                  </span>
                </span>
                <button
                  onClick={handleCancelViewCompletedOrder}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Cerrar
                </button>
              </h2>
              
              {/* Contenido de solo lectura con scroll independiente */}
              <div className="flex-1 min-h-0">
                <div className="h-full space-y-3 scrollbar-professional overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Cliente
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700">
                      {getCustomerName(selectedCompletedOrder)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Fecha y Hora
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700">
                      {new Date(selectedCompletedOrder.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}, {formatTime(selectedCompletedOrder.createdAt)}
                    </div>
                  </div>

                  {selectedCompletedOrder.comment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Comentario del Pedido
                      </label>
                      <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedCompletedOrder.comment}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Productos ({selectedCompletedOrder.foods?.length || 0} items)
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded min-h-[150px] max-h-[300px] overflow-y-auto p-3">
                      {selectedCompletedOrder.foods?.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-600 text-center text-sm">No hay productos</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedCompletedOrder.foods?.map((food, index) => (
                            <div key={index} className="bg-white rounded p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800">
                                    {food.food?.title || 'Producto'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ${food.food?.price?.toFixed(2) || '0.00'} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    Cantidad: {food.quantity || 1}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-800">
                                    ${((food.food?.price || 0) * (food.quantity || 1)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Comentarios del producto */}
                              {food.comment && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Comentario:</span> 
                                    <span className="whitespace-pre-wrap"> "{food.comment}"</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Método de Pago
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700">
                      {selectedCompletedOrder.payment || 'No especificado'}
                    </div>
                  </div>

                  <div className="bg-gray-200 border border-gray-400 rounded p-3">
                    <div className="flex justify-between text-lg font-semibold text-gray-800">
                      <span>Total:</span>
                      <span>${selectedCompletedOrder.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="pt-3 border-t border-gray-300">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Sección: {selectedCompletedOrder.section || 'mostrador'}</div>
                      {selectedCompletedOrder.updatedAt && (
                        <div>
                          {selectedCompletedOrder.status === 'Completado' ? 'Completado' : 'Cancelado'} el: {' '}
                          {new Date(selectedCompletedOrder.updatedAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}, {formatTime(selectedCompletedOrder.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Alerta de caja registradora */}
      <CashRegisterAlert
        isOpen={showCashAlert}
        onClose={() => setShowCashAlert(false)}
        onOpenCashRegister={handleOpenCash}
      />

      {/* Modal de productos */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        products={products}
        onAddToCart={isEditingOrder ? addToEditCart : addToCart}
        isLoading={productsLoading}
      />

      {/* Notificación de producto agregado */}
      {addedProductNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {addedProductNotification}
          </div>
        </div>
      )}

      {/* Modal de comentarios para productos */}
      {commentingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cancelComment}></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Comentario para {commentingProduct.name}
                </h3>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar comentario específico para este producto:
                  </label>
                  <textarea
                    value={productComment}
                    onChange={(e) => setProductComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows="3"
                    placeholder="Ej: Sin cebolla, extra queso, término 3/4..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3">
                <button
                  onClick={cancelComment}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveComment}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comentarios para productos en edición */}
      {editCommentingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cancelEditComment}></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Comentario para {editCommentingProduct.name}
                </h3>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar comentario específico para este producto:
                  </label>
                  <textarea
                    value={editProductComment}
                    onChange={(e) => setEditProductComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows="3"
                    placeholder="Ej: Sin cebolla, extra queso, término 3/4..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3">
                <button
                  onClick={cancelEditComment}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEditComment}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Mostrador;