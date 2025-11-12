import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../ui';
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon as CancelIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { formatChileanCurrency } from '../../utils/dateUtils';
import { printingService } from '../../services/printingService';
import { useAuth } from '../../hooks/useAuth';
import ordersService from '../../services/ordersService';
import ProductModal from './ProductModal';

const VentaDetailModal = ({ venta, isOpen, onClose, onVentaUpdated, products = [], productsLoading = false }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({
    paymentMethods: [],
    foods: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Verificar si el usuario puede editar (owner o super_admin)
  const canEdit = user && (user.role === 'owner' || user.role === 'super_admin');

  // Inicializar datos de edición cuando se abra el modal en modo edición
  useEffect(() => {
    if (isEditing && venta) {
      setEditingData({
        name: venta.name || venta.buyer?.name || '',
        phone: venta.buyer?.phone || '',
        status: venta.status || 'Preparacion',
        paymentMethods: (venta.paymentMethods && Array.isArray(venta.paymentMethods)) 
          ? venta.paymentMethods.map(pm => ({
              method: pm.method,
              amount: pm.amount,
              _id: pm._id
            }))
          : [{ method: venta.payment || 'Efectivo', amount: venta.total || 0 }],
        section: venta.section || 'mostrador',
        comment: venta.comment || '',
        deliveryCost: venta.deliveryCost || 0,
        selectedAddress: (typeof venta.selectedAddress === 'object' && venta.selectedAddress !== null)
          ? `${venta.selectedAddress.street || ''} ${venta.selectedAddress.number || ''}, ${venta.selectedAddress.city || ''}`.trim()
          : venta.selectedAddress || '',
        foods: (venta.foods && Array.isArray(venta.foods))
          ? venta.foods.map(item => ({
              id: item.food?._id || item.food,
              title: typeof item.food === 'object' ? item.food.title : `Producto`,
              quantity: item.quantity || 1,
              comment: item.comment || '',
              price: typeof item.food === 'object' ? item.food.price : 0
            }))
          : []
      });
    }
  }, [isEditing, venta]);

  if (!venta) return null;

  // Función para iniciar la edición
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Función para cancelar la edición
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingData({});
  };

  // Función para manejar cambios en los campos editables
  const handleInputChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para manejar cambios en los productos
  const handleFoodChange = (index, field, value) => {
    setEditingData(prev => ({
      ...prev,
      foods: (prev.foods && Array.isArray(prev.foods) ? prev.foods : []).map((food, i) => 
        i === index ? { ...food, [field]: value } : food
      )
    }));
  };

  // Función para abrir modal de productos
  const handleOpenProductModal = () => {
    setShowProductModal(true);
  };

  // Función para agregar producto desde modal
  const handleAddProductFromModal = (product) => {
    const foods = editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : [];
    const existingIndex = foods.findIndex(food => food.id === product.id);
    
    if (existingIndex >= 0) {
      // Si ya existe, aumentar cantidad
      handleFoodChange(existingIndex, 'quantity', foods[existingIndex].quantity + 1);
    } else {
      // Si no existe, agregarlo
      setEditingData(prev => ({
        ...prev,
        foods: [...(prev.foods && Array.isArray(prev.foods) ? prev.foods : []), {
          id: product.id,
          title: product.title || product.name,
          quantity: 1,
          comment: '',
          price: product.price
        }]
      }));
    }
    setShowProductModal(false);
  };

  // Función para incrementar cantidad
  const handleIncreaseQuantity = (index) => {
    const foods = editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : [];
    if (foods[index]) {
      handleFoodChange(index, 'quantity', foods[index].quantity + 1);
    }
  };

  // Función para decrementar cantidad
  const handleDecreaseQuantity = (index) => {
    const foods = editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : [];
    if (foods[index]) {
      const currentQuantity = foods[index].quantity;
      if (currentQuantity > 1) {
        handleFoodChange(index, 'quantity', currentQuantity - 1);
      }
    }
  };

  // Función para eliminar un producto
  const handleRemoveFood = (index) => {
    setEditingData(prev => ({
      ...prev,
      foods: (prev.foods && Array.isArray(prev.foods) ? prev.foods : []).filter((_, i) => i !== index)
    }));
  };

  // Funciones para manejar métodos de pago
  const handlePaymentMethodChange = (index, field, value) => {
    setEditingData(prev => ({
      ...prev,
      paymentMethods: (prev.paymentMethods && Array.isArray(prev.paymentMethods) ? prev.paymentMethods : []).map((pm, i) => 
        i === index ? { 
          ...pm, 
          [field]: field === 'amount' ? (value === '' ? 0 : Number(value) || 0) : value 
        } : pm
      )
    }));
  };

  const handleAddPaymentMethod = () => {
    setEditingData(prev => ({
      ...prev,
      paymentMethods: [...(prev.paymentMethods && Array.isArray(prev.paymentMethods) ? prev.paymentMethods : []), { method: 'Efectivo', amount: 0 }]
    }));
  };

  const handleRemovePaymentMethod = (index) => {
    if (editingData.paymentMethods && editingData.paymentMethods.length > 1) {
      setEditingData(prev => ({
        ...prev,
        paymentMethods: (prev.paymentMethods && Array.isArray(prev.paymentMethods) ? prev.paymentMethods : []).filter((_, i) => i !== index)
      }));
    }
  };

  // Función para guardar los cambios
  const handleSaveChanges = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Preparar los datos para actualizar
      const updateData = {
        buyer: {
          name: editingData.name,
          phone: editingData.phone,
          addresses: venta.buyer?.addresses || []
        },
        status: editingData.status,
        paymentMethods: (editingData.paymentMethods && Array.isArray(editingData.paymentMethods) ? editingData.paymentMethods : []).filter(pm => pm.method && pm.amount > 0),
        section: editingData.section,
        comment: editingData.comment,
        deliveryCost: Number(editingData.deliveryCost) || 0,
        selectedAddress: editingData.selectedAddress,
        foods: (editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : []).filter(food => food.title && food.title !== '').map(food => ({
          food: food.id || food.title, // Si no hay ID, usar el título
          quantity: Number(food.quantity) || 1,
          comment: food.comment || ''
        }))
      };

      // Obtener el ID del pedido
      const orderId = venta._id || venta.id;
      
      // Actualizar el pedido
      const response = await ordersService.updateOrderWithoutPrint(orderId, updateData);
      
      if (response.success) {
        setNotification('Venta actualizada exitosamente');
        setTimeout(() => setNotification(null), 3000);
        setIsEditing(false);
        setEditingData({});
        
        // Llamar la función de callback si existe
        if (onVentaUpdated) {
          onVentaUpdated(response.order);
        }
      } else {
        setNotification('Error al actualizar la venta: ' + (response.message || 'Error desconocido'));
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (error) {
      console.error('Error al actualizar la venta:', error);
      setNotification('Error al actualizar la venta: ' + error.message);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Función para manejar la impresión del ticket de cliente
  const handlePrintCustomerTicket = async () => {
    try {
      // Preparar el objeto del pedido para la impresión
      const orderForPrint = {
        ...venta,
        orderNumber: venta.orderNumber || venta.id,
        foods: venta.foods || [],
        items: venta.foods || [] // Para compatibilidad
      };
      
      await printingService.printCustomerTicket(orderForPrint);
    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      setNotification('Error al imprimir el ticket. Verifique que el servicio de impresión esté funcionando.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return formatChileanCurrency(amount);
  };

  // Obtener badge de estado
  const getStatusBadge = (status) => {
    const statusConfig = {
      Preparacion: { variant: 'warning', text: 'Preparación' },
      'En camino': { variant: 'info', text: 'En camino' },
      Enviado: { variant: 'success', text: 'Enviado' },
      Completado: { variant: 'success', text: 'Completado' },
      Cancelado: { variant: 'danger', text: 'Cancelado' }
    };

    const config = statusConfig[status] || { variant: 'default', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // Obtener badges de métodos de pago múltiples
  const getPaymentMethodsBadges = (paymentMethods) => {
    if (!paymentMethods || paymentMethods.length === 0) {
      return <Badge variant="default">Sin método especificado</Badge>;
    }

    const methodConfig = {
      Efectivo: { variant: 'success', text: 'Efectivo' },
      Debito: { variant: 'info', text: 'Débito' },
      Transferencia: { variant: 'warning', text: 'Transferencia' }
    };

    return (
      <div className="flex flex-wrap gap-2">
        {paymentMethods.map((pm, index) => {
          const config = methodConfig[pm.method] || { variant: 'default', text: pm.method };
          return (
            <div key={pm._id || index} className="flex items-center gap-1">
              <Badge variant={config.variant}>{config.text}</Badge>
              <span className="text-sm font-medium text-gray-700">
                {formatCurrency(pm.amount)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Función auxiliar para compatibilidad con payment simple
  const getPaymentMethodBadge = (method) => {
    const methodConfig = {
      Efectivo: { variant: 'success', text: 'Efectivo' },
      Debito: { variant: 'info', text: 'Débito' },
      Transferencia: { variant: 'warning', text: 'Transferencia' }
    };

    const config = methodConfig[method] || { variant: 'default', text: method };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Detalle de Venta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Información principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Cliente</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del cliente"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    {venta.name || venta.buyer?.name || 'Cliente anónimo'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(venta.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Sección</p>
                {isEditing ? (
                  <select
                    value={editingData.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mostrador">Mostrador</option>
                    <option value="delivery">Delivery</option>
                  </select>
                ) : (
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {venta.section || 'No especificada'}
                  </p>
                )}
              </div>
            </div>

            {(venta.section === 'delivery' || (isEditing && editingData.section === 'delivery')) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Dirección de entrega</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingData.selectedAddress}
                      onChange={(e) => handleInputChange('selectedAddress', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Dirección de entrega"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {typeof venta.selectedAddress === 'object' ? 
                        `${venta.selectedAddress.street || ''} ${venta.selectedAddress.number || ''}, ${venta.selectedAddress.city || ''}`.trim() :
                        venta.selectedAddress
                      }
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Estado</p>
                <div className="mt-1">
                  {isEditing ? (
                    <select
                      value={editingData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Preparacion">Preparación</option>
                      {editingData.section === 'delivery' && (
                        <option value="Enviado">Enviado</option>
                      )}
                      {editingData.section === 'mostrador' && (
                        <option value="Completado">Completado</option>
                      )}
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  ) : (
                    getStatusBadge(venta.status)
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Métodos de Pago</p>
                  {isEditing && (
                    <button
                      onClick={handleAddPaymentMethod}
                      className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 px-2 py-1 rounded border border-amber-300 flex items-center gap-1"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Agregar
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {isEditing ? (
                    (editingData.paymentMethods && Array.isArray(editingData.paymentMethods) ? editingData.paymentMethods : []).map((pm, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                        <select
                          value={pm.method || 'Efectivo'}
                          onChange={(e) => handlePaymentMethodChange(index, 'method', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Debito">Débito</option>
                          <option value="Transferencia">Transferencia</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={pm.amount === 0 ? '' : pm.amount || ''}
                          onChange={(e) => handlePaymentMethodChange(index, 'amount', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Monto"
                        />
                        {(editingData.paymentMethods && editingData.paymentMethods.length > 1) && (
                          <button
                            onClick={() => handleRemovePaymentMethod(index)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      {venta.paymentMethods && venta.paymentMethods.length > 0 ? (
                        getPaymentMethodsBadges(venta.paymentMethods)
                      ) : (
                        getPaymentMethodBadge(venta.payment)
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(venta.section === 'delivery' || (isEditing && editingData.section === 'delivery')) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Costo de Delivery</p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={editingData.deliveryCost}
                      onChange={(e) => handleInputChange('deliveryCost', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(venta.deliveryCost)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {((venta.section === 'delivery' && venta.buyer?.phone) || (isEditing && editingData.section === 'delivery')) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <UserIcon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Teléfono de contacto</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Teléfono del cliente"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {venta.buyer.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productos del pedido */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Productos ({isEditing ? editingData.foods?.length || 0 : venta.foods?.length || 0})
            </h3>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenProductModal}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Agregar producto
              </Button>
            )}
          </div>
          
          {(isEditing ? (editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : []) : (venta.foods && Array.isArray(venta.foods) ? venta.foods : [])).length > 0 ? (
            <div className="space-y-3">
              {(isEditing ? (editingData.foods && Array.isArray(editingData.foods) ? editingData.foods : []) : (venta.foods && Array.isArray(venta.foods) ? venta.foods : [])).map((item, index) => {
                // Calcular precio unitario estimado desde el total del pedido
                const estimatedUnitPrice = !isEditing && venta.total && venta.foods.length === 1 ? 
                  venta.total / item.quantity : 
                  !isEditing && venta.total ? venta.total / venta.foods.reduce((sum, food) => sum + food.quantity, 0) : 0;
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-gray-900">
                          {isEditing ? item.title : (typeof item.food === 'object' && item.food?.title ? 
                            item.food.title : 
                            `Producto ${index + 1}`
                          )}
                        </span>
                        {isEditing ? (
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                            <button
                              onClick={() => handleDecreaseQuantity(index)}
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleIncreaseQuantity(index)}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                      {item.comment && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Comentario:</span> {item.comment}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        {isEditing ? (
                          <>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency((item.price || 0) * (item.quantity || 1))}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(item.price || 0)} c/u
                            </p>
                          </>
                        ) : (
                          <>
                            {typeof item.food === 'object' && item.food?.price ? (
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(item.food.price * item.quantity)}
                              </p>
                            ) : (
                              <>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(estimatedUnitPrice * item.quantity)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatCurrency(estimatedUnitPrice)} c/u (estimado)
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveFood(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No hay productos en este pedido</p>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={handleOpenProductModal}
                  className="mt-4 flex items-center gap-2 mx-auto"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar primer producto
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Comentarios adicionales */}
        {(venta.comment || isEditing) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Comentarios del pedido
            </h3>
            <div className="p-4 bg-blue-50 rounded-lg">
              {isEditing ? (
                <textarea
                  value={editingData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  rows="3"
                  placeholder="Comentarios del pedido (opcional)"
                />
              ) : (
                <p className="text-gray-700">{venta.comment}</p>
              )}
            </div>
          </div>
        )}

        {/* Resumen de totales */}
        <div className="border-t pt-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6">
            {venta.section === 'delivery' && venta.deliveryCost > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-700">Subtotal productos</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency((venta.total || 0) - (venta.deliveryCost || 0))}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-700">Costo de delivery</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(venta.deliveryCost)}
                  </p>
                </div>
                <div className="border-t border-amber-200 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-medium text-gray-700">Total del pedido</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(venta.status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-amber-700">
                        {formatCurrency(venta.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium text-gray-700">Total del pedido</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(venta.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-700">
                    {formatCurrency(venta.total)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cerrar
            </Button>
            
            <Button
              variant="primary"
              onClick={handlePrintCustomerTicket}
            >
              Imprimir Ticket
            </Button>
          </div>

          {/* Botones de edición solo para owner y super_admin */}
          {canEdit && (
            <div className="flex gap-3">
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2"
                    disabled={isSaving}
                  >
                    <CancelIcon className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveChanges}
                    className="flex items-center gap-2"
                    disabled={isSaving}
                  >
                    <CheckIcon className="h-4 w-4" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Notificación toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {notification}
            </div>
          </div>
        )}

        {/* Modal de productos */}
        {isEditing && (
          <ProductModal
            isOpen={showProductModal}
            onClose={() => setShowProductModal(false)}
            products={products}
            onAddToCart={handleAddProductFromModal}
            isLoading={productsLoading}
          />
        )}
      </div>
    </Modal>
  );
};

export default VentaDetailModal;