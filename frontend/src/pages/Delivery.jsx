import React from 'react';
import { Button } from '../components/ui';
import { PlusIcon, MinusIcon, TruckIcon, TrashIcon, MapIcon, PhoneIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useOrders, useRecentOrders } from '../hooks/useOrders';
import { useProducts, useProductSearch } from '../hooks/useProducts';
import { useCashRegister } from '../store/CashRegisterContext';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import CashRegisterAlert from '../components/common/CashRegisterAlert';
import ProductModal from '../components/common/ProductModal';
import { formatChileanCurrency } from '../utils/dateUtils';
import AddressModal from '../components/common/AddressModal';
import printingService from '../services/printingService';
import '../styles/professional.css';

const Delivery = () => {
    // Estado para forzar actualización de tiempo cada minuto
    const [now, setNow] = React.useState(Date.now());

    // Efecto para actualizar el estado 'now' cada minuto
    React.useEffect(() => {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 60000); // 1 minuto
      return () => clearInterval(interval);
    }, []);
  // Estado para crear pedido
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [showCashAlert, setShowCashAlert] = React.useState(false);
  const [showProductModal, setShowProductModal] = React.useState(false);
  
  // Estados del formulario de pedido (incluye campos específicos de delivery)
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [selectedAddressId, setSelectedAddressId] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [paymentMethods, setPaymentMethods] = React.useState([{ method: '', amount: 0 }]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState([]);
  const [addedProductNotification, setAddedProductNotification] = React.useState(null);
  const [commentingProduct, setCommentingProduct] = React.useState(null);
  const [productComment, setProductComment] = React.useState('');
  const [isCreatingOrderRequest, setIsCreatingOrderRequest] = React.useState(false);
  
  // Ref para el input de teléfono del cliente
  const customerPhoneInputRef = React.useRef(null);

  // Estados para editar pedido (incluye campos específicos de delivery)
  const [isEditingOrder, setIsEditingOrder] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [editCustomerName, setEditCustomerName] = React.useState('');
  const [editCustomerPhone, setEditCustomerPhone] = React.useState('');
  const [editSelectedAddressId, setEditSelectedAddressId] = React.useState('');
  const [editComments, setEditComments] = React.useState('');
  const [editPaymentMethods, setEditPaymentMethods] = React.useState([{ method: '', amount: 0 }]);
  const [editSearchTerm, setEditSearchTerm] = React.useState('');
  const [editCart, setEditCart] = React.useState([]);
  const [editCommentingProduct, setEditCommentingProduct] = React.useState(null);
  const [editProductComment, setEditProductComment] = React.useState('');
  const [isUpdatingOrderRequest, setIsUpdatingOrderRequest] = React.useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = React.useState(false);
  const [isCancelingOrder, setIsCancelingOrder] = React.useState(false);

  // Estados para modal de direcciones
  const [showAddressModal, setShowAddressModal] = React.useState(false);
  const [currentAddress, setCurrentAddress] = React.useState(null);
  const [showEditAddressModal, setShowEditAddressModal] = React.useState(false);
  const [editCurrentAddress, setEditCurrentAddress] = React.useState(null);
  
  // Estados para customer search y addresses - crear
  const [, setIsCustomerLoading] = React.useState(false);
  const [foundCustomer, setFoundCustomer] = React.useState(null);
  const [customerAddresses, setCustomerAddresses] = React.useState([]);
  const [deliveryCost, setDeliveryCost] = React.useState(0);
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  
  // Estados para customer search y addresses - editar
  const [, setIsEditCustomerLoading] = React.useState(false);
  const [editFoundCustomer, setEditFoundCustomer] = React.useState(null);
  const [editCustomerAddresses, setEditCustomerAddresses] = React.useState([]);
  const [editDeliveryCost, setEditDeliveryCost] = React.useState(0);
  const [showEditCustomerDropdown, setShowEditCustomerDropdown] = React.useState(false);
  const [editSelectedCustomer, setEditSelectedCustomer] = React.useState(null);

  // Ref para textarea de comentario de producto (crear y editar)
  const productCommentInputRef = React.useRef(null);
  const editProductCommentInputRef = React.useRef(null);
  
  // Refs para las modales de direcciones
  const addressModalInputRef = React.useRef(null);
  const editAddressModalInputRef = React.useRef(null);

  // Focus automático al crear pedido - focus en teléfono
  React.useEffect(() => {
    if (isCreatingOrder && customerPhoneInputRef.current) {
      customerPhoneInputRef.current.focus();
    }
  }, [isCreatingOrder]);

  // Focus automático al abrir modal de comentario de producto
  React.useEffect(() => {
    if (commentingProduct && productCommentInputRef.current) {
      const textarea = productCommentInputRef.current;
      textarea.focus();
      // Posicionar cursor al final del texto
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [commentingProduct]);

  React.useEffect(() => {
    if (editCommentingProduct && editProductCommentInputRef.current) {
      const textarea = editProductCommentInputRef.current;
      textarea.focus();
      // Posicionar cursor al final del texto
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [editCommentingProduct]);

  // Focus automático al abrir modal de dirección (nueva)
  React.useEffect(() => {
    if (showAddressModal && addressModalInputRef.current) {
      addressModalInputRef.current.focus();
    }
  }, [showAddressModal]);

  // Focus automático al abrir modal de dirección (editar) - cursor al final
  React.useEffect(() => {
    if (showEditAddressModal && editAddressModalInputRef.current) {
      const textarea = editAddressModalInputRef.current;
      textarea.focus();
      // Posicionar cursor al final del texto
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [showEditAddressModal]);

  // Estados para ver detalle de pedidos completados/cancelados
  const [isViewingCompletedOrder, setIsViewingCompletedOrder] = React.useState(false);
  const [selectedCompletedOrder, setSelectedCompletedOrder] = React.useState(null);
  
  // Hook para caja registradora
  const { 
    isOpen: isCashOpen, 
    isLoading: cashLoading, 
    openCashRegister,
    refreshCashRegisterStatus
  } = useCashRegister();
  
  // Hook para customers
  const {
    searchCustomerByPhone,
    saveCustomer,
    updateCustomer,
    addAddress,
    updateAddress,
    clearCustomer
  } = useCustomers();
  
  // Hooks para productos
  const { products, isLoading: productsLoading } = useProducts({ available: true });
  const { searchResults, searchProducts } = useProductSearch();
  
  // Hooks para búsqueda de clientes
  const { 
    searchResults: customerSearchResults, 
    isSearching: isSearchingCustomers, 
    searchCustomers, 
    clearResults: clearCustomerResults 
  } = useCustomerSearch();
  
  // Callbacks para manejar la limpieza del formulario cuando se actualiza un pedido
  const orderCallbacks = {
    onOrderRemoved: (order) => {
      // Limpiar formulario cuando un pedido se remueve de la lista de preparación
      setIsEditingOrder(false);
      setSelectedOrder(null);
      clearEditForm();
      refetchCompletedOrders();
    },
    onOrderUpdated: (order) => {
      // Callback para cuando se actualiza un pedido pero no se remueve
      console.log('Pedido actualizado:', order);
    }
  };

  // Hooks para obtener datos reales
  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError,
    updateOrderStatus,
    createOrder,
    updateOrder,
    updateOrderWithoutPrint,
  } = useOrders({ 
    section: 'delivery', 
    status: 'Preparacion' 
  }, orderCallbacks);

  const { 
    orders: completedOrders, 
    refetch: refetchCompletedOrders 
  } = useRecentOrders({ 
    limit: 10, 
    status: 'Completado,Cancelado,Enviado', 
    section: 'delivery', 
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

  // Función helper para obtener la dirección del cliente
  const getCustomerAddress = (order) => {
    // Priorizar selectedAddress del pedido, luego buyer.address, luego address, luego fallback vacío
    return order.selectedAddress || order.buyer?.address || order.address || '';
  };

  // Función helper para obtener el costo de envío
  const getDeliveryCost = (order) => {
    return order.deliveryCost || 0;
  };

  // Función helper para obtener dirección seleccionada actual
  const getSelectedAddress = () => {
    if (!foundCustomer || !selectedAddressId) return null;
    return foundCustomer.addresses?.find(addr => addr._id === selectedAddressId) || null;
  };

  // Función helper para obtener dirección seleccionada en edición
  const getEditSelectedAddress = () => {
    if (!editFoundCustomer || !editSelectedAddressId) return null;
    return editFoundCustomer.addresses?.find(addr => addr._id === editSelectedAddressId) || null;
  };

  // Función helper para obtener costo de envío actual
  const getCurrentDeliveryCost = () => {
    return deliveryCost;
  };

  // Función helper para obtener costo de envío en edición
  const getEditCurrentDeliveryCost = () => {
    return editDeliveryCost;
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
    // Siempre agregar como nueva entrada separada (nunca agrupar)
    const cartId = `new_${product.id}_${Date.now()}`;
    setAddedProductNotification(`${product.name} agregado al carrito`);
    setTimeout(() => setAddedProductNotification(null), 2000);
    setEditCart(prevCart => [...prevCart, {
      ...product,
      cartId,
      quantity: 1,
      comments: '',
      isNew: true,
      isOriginal: false,
      deleted: false
    }]);
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
  const addCommentToEditProduct = (cartId, comment) => {
    setEditCart(prevCart =>
      prevCart.map(item =>
        item.cartId === cartId
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
      addCommentToEditProduct(editCommentingProduct.cartId, editProductComment);
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

  const removeFromEditCart = (cartId) => {
    setEditCart(prevCart => {
      const item = prevCart.find(i => i.cartId === cartId);
      if (!item) return prevCart;
      // Ítems originales: marcar como eliminado visualmente (no remover)
      if (item.isOriginal) {
        return prevCart.map(i => i.cartId === cartId ? { ...i, deleted: true } : i);
      }
      // Ítems nuevos: remover directamente
      return prevCart.filter(i => i.cartId !== cartId);
    });
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

  const updateEditQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromEditCart(cartId);
      return;
    }
    setEditCart(prevCart =>
      prevCart.map(item =>
        item.cartId === cartId && item.isNew
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    return subtotal + getCurrentDeliveryCost();
  };

  const calculateEditTotal = () => {
    const subtotal = editCart.reduce((total, item) => total + (item.price * item.quantity), 0);
    return subtotal + getEditCurrentDeliveryCost();
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateEditSubtotal = () => {
    return editCart.filter(item => !item.deleted).reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Funciones para manejo de métodos de pago múltiples
  const addPaymentMethod = () => {
    const total = calculateTotal();
    const newPayment = { method: '', amount: paymentMethods.length === 0 ? total : 0 };
    setPaymentMethods(prev => [...prev, newPayment]);
  };

  const removePaymentMethod = (index) => {
    setPaymentMethods(prev => prev.filter((_, i) => i !== index));
  };

  const updatePaymentMethod = (index, field, value) => {
    // Si es el campo amount, parsear el valor formateado
    const processedValue = field === 'amount' ? parsePaymentInput(value) : value;
    setPaymentMethods(prev => 
      prev.map((payment, i) => 
        i === index ? { ...payment, [field]: processedValue } : payment
      )
    );
  };

  const addEditPaymentMethod = () => {
    const total = calculateEditTotal();
    const newPayment = { method: '', amount: editPaymentMethods.length === 0 ? total : 0 };
    setEditPaymentMethods(prev => [...prev, newPayment]);
  };

  const removeEditPaymentMethod = (index) => {
    setEditPaymentMethods(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditPaymentMethod = (index, field, value) => {
    // Si es el campo amount, parsear el valor formateado
    const processedValue = field === 'amount' ? parsePaymentInput(value) : value;
    setEditPaymentMethods(prev => 
      prev.map((payment, i) => 
        i === index ? { ...payment, [field]: processedValue } : payment
      )
    );
  };

  const getTotalPaymentAmount = (payments) => {
    return payments.reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
  };

  // Función para calcular la diferencia de pago
  const getPaymentDifference = (totalPaid, orderTotal) => {
    return totalPaid - orderTotal;
  };

  // Funciones para formatear inputs de pago
  const formatPaymentInput = (value) => {
    if (!value || value === 0) return '';
    return Math.round(value).toLocaleString('es-CL');
  };

  const parsePaymentInput = (value) => {
    if (!value) return 0;
    // Remover separadores de miles y convertir a número
    const cleanValue = value.toString().replace(/[^\d]/g, '');
    return parseInt(cleanValue) || 0;
  };

  // Función para obtener el texto de diferencia de pago
  const getPaymentDifferenceText = (difference) => {
    if (Math.abs(difference) < 0.01) {
      return null; // Exacto, no mostrar nada
    }
    if (difference < 0) {
      return `Falta: ${formatChileanCurrency(Math.abs(difference))}`;
    } else {
      return `Vuelto: ${formatChileanCurrency(difference)}`;
    }
  };

  // Actualizar el monto del primer método de pago cuando cambia el total del carrito
  React.useEffect(() => {
    if (paymentMethods.length === 1 && cart.length > 0) {
      const total = calculateTotal();
      setPaymentMethods(prev => 
        prev.map((payment, i) => i === 0 ? { ...payment, amount: total } : payment)
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, paymentMethods.length]);

  // Actualizar el monto del primer método de pago cuando cambia el total del carrito en edición
  React.useEffect(() => {
    if (editPaymentMethods.length === 1 && editCart.length > 0) {
      const total = calculateEditTotal();
      setEditPaymentMethods(prev => 
        prev.map((payment, i) => i === 0 ? { ...payment, amount: total } : payment)
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCart, editPaymentMethods.length]);

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

  // Funciones para manejar customers
  const handlePhoneChange = async (e) => {
    const phone = e.target.value;
    setCustomerPhone(phone);
    
    // Si se borra el campo, limpiar todo
    if (!phone.trim()) {
      setFoundCustomer(null);
      setCustomerAddresses([]);
      setCustomerName('');
      setSelectedAddressId('');
      setDeliveryCost(0);
      setShowCustomerDropdown(false);
      setSelectedCustomer(null);
      clearCustomerResults();
      return;
    }
    
    // Buscar clientes mientras se escribe
    if (phone.length >= 3) {
      setShowCustomerDropdown(true);
      await searchCustomers(phone);
    } else {
      setShowCustomerDropdown(false);
      clearCustomerResults();
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFoundCustomer(customer);
    setCustomerPhone(customer.phone);
    setCustomerName(customer.name || '');
    setCustomerAddresses(customer.addresses || []);
    setShowCustomerDropdown(false);
    clearCustomerResults();
    
    // Si tiene direcciones, seleccionar la primera por defecto
    if (customer.addresses && customer.addresses.length > 0) {
      setSelectedAddressId(customer.addresses[0]._id);
      setDeliveryCost(customer.addresses[0].deliveryCost || 0);
    } else {
      setSelectedAddressId('');
      setDeliveryCost(0);
    }
  };

  const handleEditPhoneChange = async (e) => {
    const phone = e.target.value;
    setEditCustomerPhone(phone);
    
    // Si se borra el campo, limpiar todo
    if (!phone.trim()) {
      setEditFoundCustomer(null);
      setEditCustomerAddresses([]);
      setEditCustomerName('');
      setEditSelectedAddressId('');
      setEditDeliveryCost(0);
      setShowEditCustomerDropdown(false);
      setEditSelectedCustomer(null);
      clearCustomerResults();
      return;
    }
    
    // Buscar clientes mientras se escribe
    if (phone.length >= 3) {
      setShowEditCustomerDropdown(true);
      await searchCustomers(phone);
    } else {
      setShowEditCustomerDropdown(false);
      clearCustomerResults();
    }
  };

  const handleEditCustomerSelect = (customer) => {
    setEditSelectedCustomer(customer);
    setEditFoundCustomer(customer);
    setEditCustomerPhone(customer.phone);
    setEditCustomerName(customer.name || '');
    setEditCustomerAddresses(customer.addresses || []);
    setShowEditCustomerDropdown(false);
    clearCustomerResults();
    
    // Buscar la dirección que coincida con la actual o seleccionar la primera
    if (selectedOrder) {
      const currentAddress = customer.addresses?.find(addr => 
        addr.address === getCustomerAddress(selectedOrder)
      );
      if (currentAddress) {
        setEditSelectedAddressId(currentAddress._id);
        setEditDeliveryCost(currentAddress.deliveryCost || 0);
      } else if (customer.addresses && customer.addresses.length > 0) {
        setEditSelectedAddressId(customer.addresses[0]._id);
        setEditDeliveryCost(customer.addresses[0].deliveryCost || 0);
      }
    } else if (customer.addresses && customer.addresses.length > 0) {
      setEditSelectedAddressId(customer.addresses[0]._id);
      setEditDeliveryCost(customer.addresses[0].deliveryCost || 0);
    }
  };

  // Funciones para modal de direcciones
  const handleAddAddress = () => {
    setCurrentAddress(null);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (addressData) => {
    const phone = customerPhone;
    
    if (!phone) {
      alert('Debe ingresar un teléfono primero');
      return;
    }

    try {
      let result;
      if (currentAddress) {
        // Actualizar dirección existente
        result = await updateAddress(phone, currentAddress._id, addressData);
      } else {
        // Agregar nueva dirección
        result = await addAddress(phone, addressData);
      }

      if (result.success) {
        // Actualizar las direcciones del cliente
        if (result.customer) {
          setFoundCustomer(result.customer);
          setCustomerAddresses(result.customer.addresses || []);
        }
        
        // Seleccionar la dirección recién agregada/editada
        if (!currentAddress && result.customer.addresses) {
          const newAddress = result.customer.addresses[result.customer.addresses.length - 1];
          setSelectedAddressId(newAddress._id);
          setDeliveryCost(newAddress.deliveryCost || 0);
        }
        
        setShowAddressModal(false);
        setCurrentAddress(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Error al guardar la dirección');
    }
  };

  const handleEditSaveAddress = async (addressData) => {
    const phone = editCustomerPhone;
    
    if (!phone) {
      alert('Debe ingresar un teléfono primero');
      return;
    }

    try {
      let result;
      if (editCurrentAddress) {
        // Actualizar dirección existente
        result = await updateAddress(phone, editCurrentAddress._id, addressData);
      } else {
        // Agregar nueva dirección
        result = await addAddress(phone, addressData);
      }

      if (result.success) {
        // Actualizar las direcciones del cliente editado
        if (result.customer) {
          setEditFoundCustomer(result.customer);
          setEditCustomerAddresses(result.customer.addresses || []);
        }
        
        // Seleccionar la dirección recién agregada/editada
        if (!editCurrentAddress && result.customer.addresses) {
          const newAddress = result.customer.addresses[result.customer.addresses.length - 1];
          setEditSelectedAddressId(newAddress._id);
          setEditDeliveryCost(newAddress.deliveryCost || 0);
        }
        
        setShowEditAddressModal(false);
        setEditCurrentAddress(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Error al guardar la dirección');
    }
  };

  const clearForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedAddressId('');
    setComments('');
    setPaymentMethods([{ method: '', amount: 0 }]);
    setSearchTerm('');
    setCart([]);
    setCommentingProduct(null);
    setProductComment('');
    setIsCreatingOrderRequest(false);
    setFoundCustomer(null);
    setCustomerAddresses([]);
    setDeliveryCost(0);
    setIsCustomerLoading(false);
    setShowCustomerDropdown(false);
    setSelectedCustomer(null);
    clearCustomerResults();
    clearCustomer();
  };

  const clearEditForm = () => {
    setEditCustomerName('');
    setEditCustomerPhone('');
    setEditSelectedAddressId('');
    setEditComments('');
    setEditPaymentMethods([{ method: '', amount: 0 }]);
    setEditSearchTerm('');
    setEditCart([]);
    setEditCommentingProduct(null);
    setEditProductComment('');
    setIsUpdatingOrderRequest(false);
    setIsCompletingOrder(false);
    setIsCancelingOrder(false);
    setEditFoundCustomer(null);
    setEditCustomerAddresses([]);
    setEditDeliveryCost(0);
    setIsEditCustomerLoading(false);
    setShowEditCustomerDropdown(false);
    setEditSelectedCustomer(null);
    clearCustomerResults();
    clearCustomer();
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
  const handleSelectOrderToEdit = async (order) => {
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
    const phone = getCustomerPhone(order);
    setEditCustomerPhone(phone);
    setEditComments(order.comment || '');
    // Cargar métodos de pago - priorizar paymentMethods si existe
    if (order.paymentMethods && Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
      // Si tiene múltiples métodos de pago, cargar el array completo
      console.log('✅ DEBUG: Cargando múltiples métodos de pago:', order.paymentMethods);
      setEditPaymentMethods(order.paymentMethods);
    } else if (order.payment && order.payment !== '' && order.payment !== 'Pendiente') {
      // Si solo tiene un método de pago tradicional válido, convertir a formato array
      console.log('✅ DEBUG: Convirtiendo método único a array:', order.payment);
      setEditPaymentMethods([{ method: order.payment, amount: order.total || 0 }]);
    } else {
      // Si no tiene métodos de pago, inicializar con un método vacío
      console.log('⚠️ DEBUG: No hay métodos de pago, inicializando vacío');
      setEditPaymentMethods([{ method: '', amount: 0 }]);
    }
    setEditDeliveryCost(getDeliveryCost(order));

    // Pre-poblar cliente instantáneamente desde order.buyer (ya viene populated del backend)
    if (order.buyer && typeof order.buyer === 'object' && order.buyer._id) {
      setEditSelectedCustomer(order.buyer);
      setEditFoundCustomer(order.buyer);
      setEditCustomerAddresses(order.buyer.addresses || []);

      // Buscar la dirección que coincida con la del pedido
      const orderAddress = getCustomerAddress(order);
      const matchingAddress = order.buyer.addresses?.find(addr => addr.address === orderAddress);
      if (matchingAddress) {
        setEditSelectedAddressId(matchingAddress._id);
        setEditDeliveryCost(matchingAddress.deliveryCost || 0);
      } else if (order.buyer.addresses && order.buyer.addresses.length > 0) {
        setEditSelectedAddressId(order.buyer.addresses[0]._id);
        setEditDeliveryCost(order.buyer.addresses[0].deliveryCost || 0);
      }
    }
    
    // Buscar customer por teléfono para cargar datos frescos (actualiza en segundo plano)
    if (phone) {
      setIsEditCustomerLoading(true);
      try {
        const foundCustomer = await searchCustomerByPhone(phone);
        if (foundCustomer) {
          // Actualizar con datos frescos del servidor
          setEditSelectedCustomer(foundCustomer);
          setEditFoundCustomer(foundCustomer);
          setEditCustomerAddresses(foundCustomer.addresses || []);
          
          // Buscar la dirección que coincida con la del pedido
          const orderAddress = getCustomerAddress(order);
          const matchingAddress = foundCustomer.addresses?.find(addr => 
            addr.address === orderAddress
          );
          if (matchingAddress) {
            setEditSelectedAddressId(matchingAddress._id);
            setEditDeliveryCost(matchingAddress.deliveryCost || 0);
          } else {
            console.log('No se encontró dirección coincidente, usando la primera disponible');
            if (foundCustomer.addresses && foundCustomer.addresses.length > 0) {
              setEditSelectedAddressId(foundCustomer.addresses[0]._id);
              setEditDeliveryCost(foundCustomer.addresses[0].deliveryCost || 0);
            }
          }
        } else {
          // No se encontró cliente - se tratará como nuevo
          setEditSelectedCustomer(null);
          setEditFoundCustomer(null);
          setEditCustomerAddresses([]);
        }
      } catch (error) {
        console.error('Error searching customer:', error);
        // En caso de error, tratar como cliente nuevo
        setEditSelectedCustomer(null);
        setEditFoundCustomer(null);
        setEditCustomerAddresses([]);
      } finally {
        setIsEditCustomerLoading(false);
      }
    }
    
    // Cargar productos del pedido en el carrito de edición
    const orderProducts = order.foods?.map((food, index) => {
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
        cartId: `orig_${index}_${productId}`,
        name: food.food?.title || 'Producto',
        price: food.food?.price || 0,
        quantity: food.quantity || 1,
        comments: food.comment || '',
        category: food.food?.category,
        isOriginal: true,
        isNew: false,
        deleted: false,
      };
    }) || [];

    // También cargar los productos eliminados previamente (para visualización)
    const deletedProducts = (order.deletedFoods || []).map((food, index) => {
      let productId;
      if (typeof food.food === 'string') {
        productId = food.food;
      } else if (food.food && typeof food.food === 'object') {
        productId = food.food._id || food.food.id;
      } else {
        productId = food.food;
      }
      return {
        id: productId,
        cartId: `del_${index}_${productId}`,
        name: food.food?.title || 'Producto eliminado',
        price: food.food?.price || 0,
        quantity: food.quantity || 1,
        comments: food.comment || '',
        category: food.food?.category,
        isOriginal: true,
        isNew: false,
        deleted: true,
      };
    });
    
    console.log('Productos cargados en editCart:', orderProducts);
    setEditCart([...orderProducts, ...deletedProducts]);
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
      
      const selectedAddress = getSelectedAddress();
      if (!selectedAddress) {
        alert('Debe seleccionar una dirección de entrega');
        return;
      }

      // Si hay un cliente seleccionado y el nombre cambió, actualizar el cliente
      if (selectedCustomer && selectedCustomer.name !== customerName) {
        console.log('Actualizando nombre del cliente:', { old: selectedCustomer.name, new: customerName });
        const updateResult = await updateCustomer(selectedCustomer._id, {
          name: customerName,
          phone: selectedCustomer.phone // Mantener el teléfono original
        });
        
        if (updateResult.success) {
          // Actualizar el cliente en el estado local
          setSelectedCustomer(updateResult.customer);
          setFoundCustomer(updateResult.customer);
        } else {
          console.warn('No se pudo actualizar el cliente:', updateResult.error);
        }
      }
      
      // Si NO hay un cliente seleccionado, crear/actualizar el cliente en la base de datos
      if (!selectedCustomer && customerPhone && customerName) {
        console.log('Creando/actualizando nuevo cliente:', { name: customerName, phone: customerPhone });
        try {
          const customerData = {
            name: customerName,
            phone: customerPhone,
            addresses: [{
              address: selectedAddress.address,
              deliveryCost: selectedAddress.deliveryCost
            }],
            comment: ''
          };
          
          const saveResult = await saveCustomer(customerData);
          if (saveResult.success) {
            console.log('Cliente creado/actualizado exitosamente:', saveResult.customer);
          } else {
            console.warn('No se pudo crear/actualizar el cliente:', saveResult.error);
          }
        } catch (error) {
          console.error('Error al crear/actualizar cliente:', error);
        }
      }
      
      // Filtrar métodos de pago válidos (opcional - puede estar vacío)
      const validPayments = paymentMethods.filter(p => p.method && p.method.trim() !== '' && p.method !== 'Método' && p.method !== 'Pendiente');

      // Preparar los datos del pedido (incluye campos específicos de delivery)
      const orderData = {
        foods: cart.map(item => ({
          food: item.id,
          quantity: item.quantity,
          comment: item.comments || ''
        })),
        payment: validPayments.length === 0 ? 'Pendiente' : (validPayments.length === 1 ? validPayments[0].method : 'Múltiple'),
        paymentMethods: validPayments.length > 0 ? validPayments : [],
        buyer: {
          name: customerName,
          phone: customerPhone,
          addresses: [{
            address: selectedAddress.address,
            deliveryCost: selectedAddress.deliveryCost
          }]
        },
        section: 'delivery',
        status: 'Preparacion',
        comment: comments,
        selectedAddress: selectedAddress.address
      };

      console.log('Creando pedido de delivery:', orderData);
      
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
      
      const selectedAddress = getEditSelectedAddress();
      if (!selectedAddress) {
        alert('Debe seleccionar una dirección de entrega');
        return;
      }

      // Si hay un cliente seleccionado y el nombre cambió, actualizar el cliente
      if (editSelectedCustomer && editSelectedCustomer.name !== editCustomerName) {
        console.log('Actualizando nombre del cliente:', { old: editSelectedCustomer.name, new: editCustomerName });
        const updateResult = await updateCustomer(editSelectedCustomer._id, {
          name: editCustomerName,
          phone: editSelectedCustomer.phone // Mantener el teléfono original
        });
        
        if (updateResult.success) {
          // Actualizar el cliente en el estado local
          setEditSelectedCustomer(updateResult.customer);
          setEditFoundCustomer(updateResult.customer);
        } else {
          console.warn('No se pudo actualizar el cliente:', updateResult.error);
        }
      }
      
      // Si NO hay un cliente seleccionado, crear/actualizar el cliente en la base de datos
      if (!editSelectedCustomer && editCustomerPhone && editCustomerName) {
        console.log('Creando/actualizando nuevo cliente en edición:', { name: editCustomerName, phone: editCustomerPhone });
        try {
          const customerData = {
            name: editCustomerName,
            phone: editCustomerPhone,
            addresses: [{
              address: selectedAddress.address,
              deliveryCost: selectedAddress.deliveryCost
            }],
            comment: ''
          };
          
          const saveResult = await saveCustomer(customerData);
          if (saveResult.success) {
            console.log('Cliente creado/actualizado exitosamente en edición:', saveResult.customer);
          } else {
            console.warn('No se pudo crear/actualizar el cliente en edición:', saveResult.error);
          }
        } catch (error) {
          console.error('Error al crear/actualizar cliente en edición:', error);
        }
      }
      
      // Filtrar métodos de pago válidos (opcional - puede estar vacío)
      const validEditPayments = editPaymentMethods.filter(p => p.method && p.method.trim() !== '' && p.method !== 'Método' && p.method !== 'Pendiente');

      // Separar ítems activos, eliminados y nuevos
      const activeFoods = editCart.filter(item => !item.deleted);
      const deletedFoods = editCart.filter(item => item.isOriginal && item.deleted);
      const newFoods = editCart.filter(item => item.isNew && !item.deleted);

      // Preparar los datos del pedido actualizado (incluye campos específicos de delivery)
      const orderData = {
        foods: activeFoods.map(item => {
          console.log('Enviando item al backend:', item);
          return {
            food: item.id,
            quantity: item.quantity,
            comment: item.comments || ''
          };
        }),
        deletedFoods: deletedFoods.map(item => ({
          food: item.id,
          name: item.name,
          quantity: item.quantity,
          comment: item.comments || ''
        })),
        newFoods: newFoods.map(item => ({
          food: item.id,
          name: item.name,
          quantity: item.quantity,
          comment: item.comments || ''
        })),
        payment: validEditPayments.length === 0 ? 'Pendiente' : (validEditPayments.length === 1 ? validEditPayments[0].method : 'Múltiple'),
        paymentMethods: validEditPayments.length > 0 ? validEditPayments : [],
        buyer: {
          name: editCustomerName,
          phone: editCustomerPhone,
          addresses: [{
            address: selectedAddress.address,
            deliveryCost: selectedAddress.deliveryCost
          }]
        },
        section: 'delivery',
        status: selectedOrder.status,
        comment: editComments,
        selectedAddress: selectedAddress.address
      };

      console.log('Datos completos a enviar:', orderData);
      console.log('Foods a enviar:', orderData.foods);
      
      // Validar que todos los productos tengan IDs válidos
      const invalidFoods = orderData.foods.filter(food => !food.food || typeof food.food !== 'string');
      if (invalidFoods.length > 0) {
        console.error('Productos con IDs inválidos:', invalidFoods);
        throw new Error('Algunos productos no tienen IDs válidos');
      }

      console.log('Actualizando pedido de delivery:', orderData);
      
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

  // Función para manejar caja registradora y notificaciones al completar pedido
  const handleCompleteOrderWithCash = async (orderId, orderData, successMessage = 'Pedido enviado exitosamente') => {
    const response = await updateOrderWithoutPrint(orderId, orderData);
    
    if (response.success) {
      // Refrescar el estado de la caja registradora si está abierta
      // (La orden ya se crea automáticamente con el campo cashRegister)
      if (isCashOpen) {
        try {
          await refreshCashRegisterStatus();
          console.log('Estado de caja actualizado después de completar el pedido');
        } catch (error) {
          console.error('Error al refrescar estado de caja:', error);
        }
      }
      
      // Mostrar notificación de éxito
      setAddedProductNotification(successMessage);
      setTimeout(() => setAddedProductNotification(null), 2000);
    }
    
    return response;
  };

  // Función para manejar notificaciones al cancelar pedido
  const handleCancelOrderWithNotification = async (orderId) => {
    const result = await updateOrderStatus(orderId, 'Cancelado');
    
    if (result.success) {
      // Mostrar notificación de éxito
      setAddedProductNotification('Pedido cancelado exitosamente');
      setTimeout(() => setAddedProductNotification(null), 2000);
    }
    
    return result;
  };

  const handleCompleteOrder = async (orderId) => {
    if (isCompletingOrder || !orderId) {
      if (!orderId) alert('Error: ID del pedido no válido');
      return;
    }
    
    // Validaciones simples (incluye validaciones específicas de delivery)
    const activeFoodsForComplete = editCart.filter(item => !item.deleted);
    if (!editCart || activeFoodsForComplete.length === 0) {
      alert('⚠️ Debe agregar al menos un producto al pedido');
      return;
    }
    
    // Validar que todos los métodos de pago tengan método seleccionado
    const invalidPayments = editPaymentMethods.filter(p => !p.method || p.method.trim() === '' || p.method === 'Método' || p.method === 'Pendiente');
    if (invalidPayments.length > 0) {
      alert('⚠️ Todos los métodos de pago deben tener un método seleccionado. Por favor, complete todos los campos o elimine los métodos vacíos.');
      return;
    }
    
    // Validar métodos de pago
    const validEditPayments = editPaymentMethods.filter(p => p.method && p.method.trim() !== '' && p.method !== 'Método' && p.method !== 'Pendiente');
    if (validEditPayments.length === 0) {
      alert('⚠️ Debe agregar al menos un método de pago');
      return;
    }

    const totalEditPaymentAmount = getTotalPaymentAmount(validEditPayments);
    const editOrderTotal = calculateEditTotal();
    
    if (totalEditPaymentAmount < editOrderTotal - 0.01) {
      alert(`⚠️ El monto pagado (${formatChileanCurrency(totalEditPaymentAmount)}) es menor al total del pedido (${formatChileanCurrency(editOrderTotal)})`);
      return;
    }

    if (!editCustomerPhone || editCustomerPhone.trim() === '') {
      alert('⚠️ Debe ingresar el teléfono del cliente');
      return;
    }

    if (!editSelectedAddressId) {
      alert('⚠️ Debe seleccionar una dirección de entrega');
      return;
    }
    
    // Preparar los datos del pedido actualizado antes de enviar
    const selectedAddress = getEditSelectedAddress();
    if (!selectedAddress) {
      alert('⚠️ Error: No se pudo obtener la información de la dirección');
      return;
    }

    const orderData = {
      foods: activeFoodsForComplete.map(item => ({
        food: item.id,
        quantity: item.quantity,
        comment: item.comments || ''
      })),
      deletedFoods: editCart.filter(item => item.isOriginal && item.deleted).map(item => ({
        food: item.id,
        name: item.name,
        quantity: item.quantity,
        comment: item.comments || ''
      })),
      payment: validEditPayments.length === 1 ? validEditPayments[0].method : 'Múltiple',
      paymentMethods: validEditPayments,
      buyer: {
        name: editCustomerName,
        phone: editCustomerPhone,
        addresses: [{
          address: selectedAddress.address,
          deliveryCost: selectedAddress.deliveryCost
        }]
      },
      section: 'delivery',
      status: 'Enviado', // Cambiar a enviado para delivery
      comment: editComments,
      selectedAddress: selectedAddress.address
    };

    try {
      setIsCompletingOrder(true);
      // Primero, intentar guardar/actualizar el cliente si es necesario
      if (editSelectedCustomer) {
        try {
          const customerData = {
            name: editCustomerName,
            phone: editCustomerPhone,
            addresses: [{
              address: selectedAddress.address,
              deliveryCost: selectedAddress.deliveryCost
            }],
            comment: ''
          };
          
          const saveResult = await saveCustomer(customerData);
          if (saveResult.success) {
            console.log('Cliente actualizado exitosamente antes de enviar:', saveResult.customer);
          } else {
            console.warn('No se pudo actualizar el cliente antes de enviar:', saveResult.error);
          }
        } catch (error) {
          console.error('Error al actualizar cliente antes de enviar:', error);
        }
      }

        // Actualizar el pedido con estado completado usando la función wrapper
        const orderId = selectedOrder._id || selectedOrder.id;
        const response = await handleCompleteOrderWithCash(orderId, orderData, 'Pedido enviado exitosamente');
        
        if (!response.success) {
          alert('Error al enviar el pedido: ' + (response.error || 'Error desconocido'));
          return;
        }
    } catch (error) {
      console.error('Error al enviar el pedido:', error);
      alert('Error al enviar el pedido: ' + error.message);
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    console.log('Cancelando pedido con ID:', orderId); // Debug log
    if (isCancelingOrder || !orderId) {
      if (!orderId) alert('Error: ID del pedido no válido');
      return;
    }
    
    try {
      setIsCancelingOrder(true);
      const result = await handleCancelOrderWithNotification(orderId);
      if (!result.success) {
        alert('Error al cancelar el pedido: ' + result.error);
      }
    } catch (error) {
      console.error('Error al cancelar el pedido:', error);
      alert('Error al cancelar el pedido: ' + error.message);
    } finally {
      setIsCancelingOrder(false);
    }
  };

  // Función para imprimir ticket de cliente
  const handlePrintCustomerTicket = async (order) => {
    try {
      const result = await printingService.printCustomerTicket(order);
      if (result.success) {
        // Mostrar notificación de éxito
        console.log('Ticket impreso exitosamente');
        // Aquí podrías agregar una notificación toast si tienes un sistema de notificaciones
      } else {
        console.error('Error al imprimir ticket:', result.error);
        alert(`Error al imprimir ticket: ${result.error}`);
      }
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      alert('Error al imprimir ticket. Verifique que el servicio de impresión esté funcionando.');
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
    } else if (result.requiresSubscription) {
      // NO cerrar el modal, dejar que CashRegisterAlert maneje la vista de suscripción
      // El modal se quedará abierto mostrando la alerta de suscripción
    }
    return result;
  };

  // Mostrar loading si está cargando la caja o los pedidos
  if (cashLoading || (ordersLoading && isCashOpen)) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <div className="text-center bg-white rounded-lg shadow-lg p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-blue-body">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay algún error
  if (ordersError) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <div className="text-center bg-white rounded-lg shadow-lg p-12 border-red-200">
          <p className="text-red-600 mb-6 font-medium">Error al cargar pedidos: {ordersError}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Recargar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full bg-blue-50 flex flex-col gap-4 p-4 overflow-hidden">
        {/* Header con botón crear pedido */}
        <div className={`flex justify-between items-center flex-shrink-0 ${
          !isCreatingOrder && !isEditingOrder && !isViewingCompletedOrder 
            ? 'max-w-6xl mx-auto w-full' 
            : ''
        }`}>
          <h1 className="text-blue-title flex items-center gap-2">
            <TruckIcon className="w-8 h-8" />
            Delivery
          </h1>
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
            className="btn-blue-primary flex items-center gap-2"
          >
            {isCreatingOrder ? <MinusIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
            {isCreatingOrder ? 'Cancelar' : 'Crear Pedido'}
          </Button>
        </div>

        {/* Contenido principal con altura fija */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Columna izquierda - Formulario de creación (cuando está activo) */}
        {isCreatingOrder && (
          <div className="w-[480px] flex-shrink-0">
            <div className="h-full flex flex-col card-blue p-4">
              <h2 className="text-blue-subtitle mb-3 flex-shrink-0">Creando Nuevo Pedido - Delivery</h2>
              
              {/* Formulario temporal con scroll independiente */}
              <div className="flex-1 min-h-0">
                <div className="h-full space-y-3 scrollbar-professional overflow-y-auto pr-2">
                  <div>
                    <label className="text-sm font-medium text-blue-body mb-1 flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" />
                      Teléfono del Cliente
                      {selectedCustomer && (
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setFoundCustomer(null);
                              setCustomerAddresses([]);
                              setSelectedAddressId('');
                              setDeliveryCost(0);
                              setCustomerName('');
                              setCustomerPhone('');
                              clearCustomerResults();
                            }}
                            className="text-red-600 hover:text-red-800 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                          >
                            Deseleccionar
                          </button>
                          
                        </div>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        className={`input-blue ${
                          selectedCustomer ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder={selectedCustomer ? 
                          "Cliente seleccionado - use 'Deseleccionar' para cambiar" : 
                          "+591 70123456 - Escriba para buscar cliente"
                        }
                        value={customerPhone}
                        onChange={selectedCustomer ? undefined : handlePhoneChange}
                        readOnly={!!selectedCustomer}
                        ref={customerPhoneInputRef}
                        onFocus={() => {
                          if (!selectedCustomer && customerSearchResults.length > 0) {
                            setShowCustomerDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay para permitir click en dropdown
                          setTimeout(() => setShowCustomerDropdown(false), 200);
                        }}
                      />
                      {!selectedCustomer && isSearchingCustomers && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {/* Dropdown de clientes */}
                      {!selectedCustomer && showCustomerDropdown && customerSearchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {customerSearchResults.map((customer) => (
                            <div
                              key={customer._id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-600">{customer.phone}</div>
                                </div>
                                <div className="text-xs text-blue-600">
                                  {customer.addresses?.length || 0} dirección(es)
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-t">
                            {customerSearchResults.length === 0 ? 
                              'No se encontraron clientes. Se creará un nuevo cliente.' :
                              `${customerSearchResults.length} cliente(s) encontrado(s)`
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    {!selectedCustomer && customerPhone.length >= 3 && (
                      <div className="mt-1 text-xs text-blue-600">
                        💡 Nuevo cliente - se creará automáticamente
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      className="input-blue"
                      placeholder="Ingrese el nombre del cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-blue-body mb-1 flex items-center gap-1">
                      <MapIcon className="w-4 h-4" />
                      Dirección de Entrega
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        className="ml-auto text-blue-600 hover:text-blue-body text-sm"
                      >
                        + Agregar dirección
                      </button>
                    </label>
                    {customerAddresses.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          className="input-blue"
                          value={selectedAddressId}
                          onChange={(e) => {
                            const addressId = e.target.value;
                            setSelectedAddressId(addressId);
                            if (addressId) {
                              const selectedAddress = customerAddresses.find(addr => addr._id === addressId);
                              if (selectedAddress) {
                                setDeliveryCost(selectedAddress.deliveryCost || 0);
                              }
                            }
                          }}
                        >
                          <option value="">Seleccionar dirección</option>
                          {customerAddresses.map((address) => (
                            <option key={address._id} value={address._id}>
                              {address.address} - Envío: {address.deliveryCost || 0}
                            </option>
                          ))}
                        </select>
                        {selectedAddressId && (
                          <button
                            type="button"
                            onClick={() => {
                              const selectedAddress = customerAddresses.find(addr => addr._id === selectedAddressId);
                              if (selectedAddress) {
                                setCurrentAddress(selectedAddress);
                                setShowAddressModal(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-body text-sm"
                          >
                            Editar dirección seleccionada
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm py-2">
                        {!customerPhone ? 'Ingrese un teléfono primero' : 
                         'No hay direcciones registradas. Haga clic en "Agregar dirección" para crear una.'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Comentario
                    </label>
                    <textarea
                      className="input-blue resize-none"
                      rows="2"
                      placeholder="Comentarios adicionales del pedido"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Buscar Productos
                    </label>
                    <input
                      type="text"
                      className="input-blue mb-2"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    {/* Resultados de búsqueda */}
                    {searchTerm && searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-blue-200 rounded-md mb-2">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
                              <span className="text-sm font-semibold text-blue-600">
                                {formatChileanCurrency(product.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      className="w-full px-3 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      onClick={() => setShowProductModal(true)}
                    >
                      Ver Productos
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Carrito ({cart.length} items)
                    </label>
                    <div className="border border-blue-200 rounded-md p-3 bg-gray-50">
                      {cart.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-blue-600 text-center text-sm">El carrito está vacío</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item) => (
                            <div key={item.id} className="bg-white rounded p-3 border border-blue-100">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatChileanCurrency(item.price)} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
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
                    <label className="flex items-center justify-between text-sm font-medium text-blue-body mb-1">
                      Métodos de Pago
                      <button
                        type="button"
                        onClick={addPaymentMethod}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                        title="Agregar método de pago"
                      >
                        +
                      </button>
                    </label>
                    <div className="space-y-2">
                      {paymentMethods.map((payment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select 
                            className="input-blue flex-1"
                            value={payment.method}
                            onChange={(e) => updatePaymentMethod(index, 'method', e.target.value)}
                          >
                            <option value="">Método</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Debito">Débito</option>
                            <option value="Transferencia">Transferencia</option>
                          </select>
                          <input
                            type="text"
                            className="input-blue flex-1"
                            placeholder="Monto"
                            value={formatPaymentInput(payment.amount)}
                            onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                            onKeyDown={(e) => {
                              // Solo permitir números, backspace, delete, tab
                              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                          {paymentMethods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePaymentMethod(index)}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                              title="Eliminar método de pago"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                      {paymentMethods.length > 0 && (
                        <div className="text-xs mt-1 space-y-1">
                          <div className="text-gray-600">
                            Total pagado: {formatChileanCurrency(getTotalPaymentAmount(paymentMethods))}
                          </div>
                          {(() => {
                            const totalPaid = getTotalPaymentAmount(paymentMethods);
                            const orderTotal = calculateTotal();
                            const difference = getPaymentDifference(totalPaid, orderTotal);
                            const differenceText = getPaymentDifferenceText(difference);
                            
                            return differenceText && (
                              <div className={`font-medium ${
                                difference < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {differenceText}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="total-highlight-blue">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatChileanCurrency(calculateSubtotal())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costo de envío:</span>
                        <span>{formatChileanCurrency(getCurrentDeliveryCost())}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold border-t border-blue-300 pt-1">
                        <span>Total:</span>
                        <span>{formatChileanCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón al final del scroll */}
                  <div className="pt-3">
                    <button 
                      className="w-full btn-blue-primary"
                      onClick={handleCreateOrder}
                      disabled={isCreatingOrderRequest}
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
            <div className="h-full flex flex-col card-blue p-4">
              <h2 className="text-blue-subtitle mb-3 flex-shrink-0 flex items-center gap-3">
                <TruckIcon className="w-6 h-6 text-blue-600" />
                Pedidos en Preparación
              </h2>
              
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Encabezado de la tabla - fijo */}
                <div className="table-header-blue grid grid-cols-7 gap-3 mb-2 flex-shrink-0">
                  <div className="text-center font-semibold text-sm">#</div>
                  <div className="text-center font-semibold text-sm">Fecha/Hora</div>
                  <div className="text-center font-semibold text-sm">Tiempo</div>
                  <div className="text-center font-semibold text-sm">Cliente</div>
                  <div className="text-center font-semibold text-sm">Teléfono</div>
                  <div className="text-center font-semibold text-sm">Estado</div>
                  <div className="text-center font-semibold text-sm">Total</div>
                </div>
                
                {/* Lista de pedidos con scroll independiente */}
                <div className="flex-1 overflow-y-auto scrollbar-professional space-y-1 pr-1">
                  {orders.map((order, index) => (
                    <div 
                      key={order._id || order.id} 
                      className={`grid grid-cols-7 gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                        (selectedOrder?._id || selectedOrder?.id) === (order._id || order.id)
                          ? 'bg-blue-100 shadow-md border-blue-300' 
                          : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                      onClick={() => handleSelectOrderToEdit(order)}
                    >
                      <div className="text-center font-semibold text-blue-body text-sm">
                        {order.orderNumber}
                      </div>
                      <div className="text-center text-xs text-blue-600">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}, {formatTime(order.createdAt)}
                      </div>
                      <div className="text-center">
                        <span className="text-blue-500 font-medium text-xs">
                          {Math.max(0, Math.floor((now - new Date(order.createdAt)) / 60000))} min
                        </span>
                      </div>
                      <div className="text-center text-blue-body font-medium text-sm truncate">
                        {getCustomerName(order)}
                      </div>
                      <div className="text-center text-blue-600 text-xs truncate">
                        {getCustomerPhone(order) || 'N/A'}
                      </div>
                      <div className="text-center">
                        <span className="bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-full px-2 py-1 text-xs font-medium">
                          Preparación
                        </span>
                      </div>
                      <div className="text-center font-semibold text-blue-body text-sm">
                        {formatChileanCurrency(order.total || 0)}
                      </div>
                    </div>
                  ))}
                  
                  {orders.length === 0 && (
                    <div className="text-center py-8 text-blue-500">
                      No hay pedidos en preparación
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pedidos completados recientes - 40% de la altura */}
          <div className="flex-[40] min-h-0">
            <div className="h-full flex flex-col card-blue p-4">
              <h2 className="text-blue-subtitle mb-3 flex-shrink-0">
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
                          ? (['Completado', 'Enviado'].includes(order.status) ? 'bg-green-200 border-green-400' : 'bg-red-200 border-red-400')
                          : (['Completado', 'Enviado'].includes(order.status) ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100')
                      } border-l-4 ${
                        (selectedCompletedOrder?._id || selectedCompletedOrder?.id) === (order._id || order.id)
                          ? (['Completado', 'Enviado'].includes(order.status) ? 'border-green-500' : 'border-red-500')
                          : (['Completado', 'Enviado'].includes(order.status) ? 'border-green-500' : 'border-red-500')
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
                        <span className={['Completado', 'Enviado'].includes(order.status) ? 'bg-green-100 border-green-300 text-green-600 rounded-full px-1 py-0.5 text-xs font-medium' : 'bg-red-100 border-red-300 text-red-600 rounded-full px-1 py-0.5 text-xs font-medium'}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-center font-semibold text-gray-800 text-xs">
                        {formatChileanCurrency(order.total || 0)}
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
            <div className="h-full flex flex-col card-blue p-4">
              <h2 className="text-blue-subtitle mb-3 flex-shrink-0 flex items-center justify-between">
                <span>Editando Pedido #{selectedOrder.orderNumber}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintCustomerTicket(selectedOrder)}
                    className="text-blue-600 hover:text-blue-body text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    title="Imprimir ticket de cliente"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    
                  </button>
                  <button
                    onClick={handleCancelEditOrder}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    ✕ Cerrar
                  </button>
                </div>
              </h2>
              
              {/* Formulario de edición con scroll independiente */}
              <div className="flex-1 min-h-0">
                <div className="h-full space-y-3 scrollbar-professional overflow-y-auto pr-2">
                  <div>
                    <label className="text-sm font-medium text-blue-body mb-1 flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" />
                      Teléfono del Cliente
                      {editSelectedCustomer && (
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditSelectedCustomer(null);
                              setEditFoundCustomer(null);
                              setEditCustomerAddresses([]);
                              setEditSelectedAddressId('');
                              setEditDeliveryCost(0);
                              setEditCustomerName('');
                              setEditCustomerPhone('');
                              clearCustomerResults();
                            }}
                            className="text-red-600 hover:text-red-800 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                          >
                            Deseleccionar
                          </button>
                        </div>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        className={`input-blue ${
                          editSelectedCustomer ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder={editSelectedCustomer ? 
                          "Cliente seleccionado - use 'Deseleccionar' para cambiar" : 
                          "+591 70123456 - Escriba para buscar cliente"
                        }
                        value={editCustomerPhone}
                        onChange={editSelectedCustomer ? undefined : handleEditPhoneChange}
                        readOnly={!!editSelectedCustomer}
                        onFocus={() => {
                          if (!editSelectedCustomer && customerSearchResults.length > 0) {
                            setShowEditCustomerDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay para permitir click en dropdown
                          setTimeout(() => setShowEditCustomerDropdown(false), 200);
                        }}
                      />
                      {!editSelectedCustomer && isSearchingCustomers && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {/* Dropdown de clientes */}
                      {!editSelectedCustomer && showEditCustomerDropdown && customerSearchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {customerSearchResults.map((customer) => (
                            <div
                              key={customer._id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleEditCustomerSelect(customer)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-sm text-gray-600">{customer.phone}</div>
                                </div>
                                <div className="text-xs text-blue-600">
                                  {customer.addresses?.length || 0} dirección(es)
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-t">
                            {customerSearchResults.length === 0 ? 
                              'No se encontraron clientes. Se creará un nuevo cliente.' :
                              `${customerSearchResults.length} cliente(s) encontrado(s)`
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    {!editSelectedCustomer && editCustomerPhone.length >= 3 && (
                      <div className="mt-1 text-xs text-blue-600">
                        💡 Nuevo cliente - se creará automáticamente
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      className="input-blue"
                      placeholder="Ingrese el nombre del cliente"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-blue-body mb-1 flex items-center gap-1">
                      <MapIcon className="w-4 h-4" />
                      Dirección de Entrega
                      <button
                        type="button"
                        onClick={() => setShowEditAddressModal(true)}
                        className="ml-auto text-blue-600 hover:text-blue-body text-sm"
                      >
                        + Agregar dirección
                      </button>
                    </label>
                    {editCustomerAddresses.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          className="input-blue"
                          value={editSelectedAddressId}
                          onChange={(e) => {
                            const addressId = e.target.value;
                            setEditSelectedAddressId(addressId);
                            if (addressId) {
                              const selectedAddress = editCustomerAddresses.find(addr => addr._id === addressId);
                              if (selectedAddress) {
                                setEditDeliveryCost(selectedAddress.deliveryCost || 0);
                              }
                            }
                          }}
                        >
                          <option value="">Seleccionar dirección</option>
                          {editCustomerAddresses.map((address) => (
                            <option key={address._id} value={address._id}>
                              {address.address} - Envío: {address.deliveryCost || 0}
                            </option>
                          ))}
                        </select>
                        {editSelectedAddressId && (
                          <button
                            type="button"
                            onClick={() => {
                              const selectedAddress = editCustomerAddresses.find(addr => addr._id === editSelectedAddressId);
                              if (selectedAddress) {
                                setEditCurrentAddress(selectedAddress);
                                setShowEditAddressModal(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-body text-sm"
                          >
                            Editar dirección seleccionada
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm py-2">
                        No hay direcciones registradas. Haga clic en "Agregar dirección" para crear una.
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Comentario
                    </label>
                    <textarea
                      className="input-blue resize-none"
                      rows="2"
                      placeholder="Comentarios adicionales del pedido"
                      value={editComments}
                      onChange={(e) => setEditComments(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Buscar Productos
                    </label>
                    <input
                      type="text"
                      className="input-blue mb-2"
                      placeholder="Buscar productos..."
                      value={editSearchTerm}
                      onChange={handleEditSearchChange}
                    />
                    {/* Resultados de búsqueda para edición */}
                    {editSearchTerm && searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-blue-200 rounded-md mb-2">
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
                              <span className="text-sm font-semibold text-blue-600">
                                {formatChileanCurrency(product.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      className="w-full px-3 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      onClick={() => setShowProductModal(true)}
                    >
                      Ver Productos
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-body mb-1">
                      Carrito ({editCart.filter(i => !i.deleted).length} items)
                      {editCart.some(i => i.deleted) && (
                        <span className="ml-2 text-xs text-red-500 font-normal">
                          ({editCart.filter(i => i.deleted).length} eliminado{editCart.filter(i => i.deleted).length > 1 ? 's' : ''})
                        </span>
                      )}
                    </label>
                    <div className="border border-blue-200 rounded-md p-3 bg-gray-50">
                      {editCart.filter(i => !i.deleted).length === 0 && editCart.filter(i => i.deleted).length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-blue-600 text-center text-sm">El carrito está vacío</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {editCart.map((item) => (
                            <div
                              key={item.cartId || item.id}
                              className={`rounded p-3 border transition-all ${
                                item.deleted
                                  ? 'bg-red-50 border-red-200 opacity-70'
                                  : item.isNew
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-blue-100'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium flex items-center gap-2 ${item.deleted ? 'line-through text-red-400' : ''}`}>
                                    {item.name}
                                    {item.isNew && !item.deleted && (
                                      <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full font-semibold">NUEVO</span>
                                    )}
                                  </div>
                                  <div className={`text-xs ${item.deleted ? 'line-through text-red-300' : 'text-gray-500'}`}>
                                    {formatChileanCurrency(item.price)} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {item.isNew && !item.deleted ? (
                                    <>
                                      <button
                                        onClick={() => updateEditQuantity(item.cartId, item.quantity - 1)}
                                        className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                                      <button
                                        onClick={() => updateEditQuantity(item.cartId, item.quantity + 1)}
                                        className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                                      >
                                        +
                                      </button>
                                    </>
                                  ) : item.isOriginal && !item.deleted ? (
                                    <span className="text-sm text-gray-500 w-16 text-center">x{item.quantity}</span>
                                  ) : item.deleted ? (
                                    <span className="text-xs text-red-400 line-through w-16 text-center">x{item.quantity}</span>
                                  ) : null}
                                  {!item.deleted && (
                                    <button
                                      onClick={() => removeFromEditCart(item.cartId || item.id)}
                                      className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs"
                                      title={item.isOriginal ? 'Marcar como eliminado' : 'Quitar del carrito'}
                                    >
                                      <TrashIcon className="w-3 h-3 mx-auto" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Comentarios del producto */}
                              {!item.deleted && (
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
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-blue-body mb-1">
                      Métodos de Pago
                      <button
                        type="button"
                        onClick={addEditPaymentMethod}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                        title="Agregar método de pago"
                      >
                        +
                      </button>
                    </label>
                    <div className="space-y-2">
                      {editPaymentMethods.map((payment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select 
                            className="input-blue flex-1"
                            value={payment.method}
                            onChange={(e) => updateEditPaymentMethod(index, 'method', e.target.value)}
                          >
                            <option value="">Método</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Debito">Débito</option>
                            <option value="Transferencia">Transferencia</option>
                          </select>
                          <input
                            type="text"
                            className="input-blue flex-1"
                            placeholder="Monto"
                            value={formatPaymentInput(payment.amount)}
                            onChange={(e) => updateEditPaymentMethod(index, 'amount', e.target.value)}
                            onKeyDown={(e) => {
                              // Solo permitir números, backspace, delete, tab
                              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                          {editPaymentMethods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditPaymentMethod(index)}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                              title="Eliminar método de pago"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                      {editPaymentMethods.length > 0 && (
                        <div className="text-xs mt-1 space-y-1">
                          <div className="text-gray-600">
                            Total pagado: {formatChileanCurrency(getTotalPaymentAmount(editPaymentMethods))}
                          </div>
                          {(() => {
                            const totalPaid = getTotalPaymentAmount(editPaymentMethods);
                            const orderTotal = calculateEditTotal();
                            const difference = getPaymentDifference(totalPaid, orderTotal);
                            const differenceText = getPaymentDifferenceText(difference);
                            
                            return differenceText && (
                              <div className={`font-medium ${
                                difference < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {differenceText}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="total-highlight-blue">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatChileanCurrency(calculateEditSubtotal())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costo de envío:</span>
                        <span>{formatChileanCurrency(editDeliveryCost)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold border-t border-blue-300 pt-1">
                        <span>Total:</span>
                        <span>{formatChileanCurrency(calculateEditTotal())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones al final del scroll */}
                  <div className="pt-3 space-y-2">
                    <button 
                      className="w-full btn-blue-primary"
                      disabled={isUpdatingOrderRequest}
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
                        className={`flex-1 py-2 px-4 rounded transition-colors text-sm ${
                          isCompletingOrder || isUpdatingOrderRequest
                            ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        disabled={isCompletingOrder || isUpdatingOrderRequest}
                        onClick={() => handleCompleteOrder(selectedOrder._id || selectedOrder.id)}
                      >
                        {isCompletingOrder ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Enviando...
                          </div>
                        ) : (
                          'Enviar'
                        )}
                      </button>
                      <button 
                        className={`flex-1 py-2 px-4 rounded transition-colors text-sm ${
                          isCancelingOrder || isUpdatingOrderRequest
                            ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        disabled={isCancelingOrder || isUpdatingOrderRequest}
                        onClick={() => handleCancelOrder(selectedOrder._id || selectedOrder.id)}
                      >
                        {isCancelingOrder ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Cancelando...
                          </div>
                        ) : (
                          'Cancelar'
                        )}
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
            <div className="h-full flex flex-col bg-gray-50 rounded-lg shadow-lg border border-gray-300 p-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-3 flex-shrink-0 flex items-center justify-between">
                <span>
                  Detalle Pedido #{selectedCompletedOrder.orderNumber} 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    ['Completado', 'Enviado'].includes(selectedCompletedOrder.status) 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {selectedCompletedOrder.status}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintCustomerTicket(selectedCompletedOrder)}
                    className="text-blue-600 hover:text-blue-body text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    title="Imprimir ticket de cliente"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Ticket
                  </button>
                  <button
                    onClick={handleCancelViewCompletedOrder}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    ✕ Cerrar
                  </button>
                </div>
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
                    <label className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" />
                      Teléfono
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700">
                      {getCustomerPhone(selectedCompletedOrder) || 'No especificado'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <MapIcon className="w-4 h-4" />
                      Dirección de Entrega
                    </label>
                    <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                      {getCustomerAddress(selectedCompletedOrder) || 'No especificada'}
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
                                    {formatChileanCurrency(food.food?.price || 0)} c/u
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">
                                    Cantidad: {food.quantity || 1}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-800">
                                    {formatChileanCurrency((food.food?.price || 0) * (food.quantity || 1))}
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
                      {selectedCompletedOrder.paymentMethods && selectedCompletedOrder.paymentMethods.length > 1 ? (
                        <div className="space-y-1">
                          {selectedCompletedOrder.paymentMethods.map((payment, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{payment.method}</span>
                              <span className="font-medium">{formatChileanCurrency(payment.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        selectedCompletedOrder.payment || 'No especificado'
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-200 border border-gray-400 rounded p-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-gray-800">
                        <span>Subtotal:</span>
                        <span>{formatChileanCurrency((selectedCompletedOrder.total - getDeliveryCost(selectedCompletedOrder)) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-800">
                        <span>Costo de envío:</span>
                        <span>{formatChileanCurrency(getDeliveryCost(selectedCompletedOrder) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold text-gray-800 border-t border-gray-400 pt-1">
                        <span>Total:</span>
                        <span>{formatChileanCurrency(selectedCompletedOrder.total || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="pt-3 border-t border-gray-300">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Sección: {selectedCompletedOrder.section || 'delivery'}</div>
                      {selectedCompletedOrder.updatedAt && (
                        <div>
                          {selectedCompletedOrder.status === 'Completado' ? 'Completado' : 
                           selectedCompletedOrder.status === 'Enviado' ? 'Enviado' : 'Cancelado'} el: {' '}
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
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
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
                    className="input-blue"
                    rows="3"
                    placeholder="Ej: Sin cebolla, extra queso, término 3/4..."
                    ref={productCommentInputRef}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                    className="input-blue"
                    rows="3"
                    placeholder="Ej: Sin cebolla, extra queso, término 3/4..."
                    ref={editProductCommentInputRef}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de dirección para crear */}
      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => {
            setShowAddressModal(false);
            setCurrentAddress(null);
          }}
          onSave={handleSaveAddress}
          address={currentAddress}
          customer={foundCustomer}
          inputRef={addressModalInputRef}
        />
      )}

      {/* Modal de dirección para editar */}
      {showEditAddressModal && (
        <AddressModal
          isOpen={showEditAddressModal}
          onClose={() => {
            setShowEditAddressModal(false);
            setEditCurrentAddress(null);
          }}
          onSave={handleEditSaveAddress}
          address={editCurrentAddress}
          customer={editFoundCustomer}
          inputRef={editAddressModalInputRef}
        />
      )}
    </>
  );
};

export default Delivery;