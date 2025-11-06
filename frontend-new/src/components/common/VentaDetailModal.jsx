import React from 'react';
import { Modal, Button, Badge } from '../ui';
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { formatChileanCurrency } from '../../utils/dateUtils';
import { printingService } from '../../services/printingService';

const VentaDetailModal = ({ venta, isOpen, onClose }) => {
  if (!venta) return null;

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
      alert('Error al imprimir el ticket. Verifique que el servicio de impresión esté funcionando.');
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

  // Obtener badge de método de pago
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
              <div>
                <p className="text-sm font-medium text-gray-600">Cliente</p>
                <p className="text-lg font-semibold text-gray-900">
                  {venta.name || venta.buyer?.name || 'Cliente anónimo'}
                </p>
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
              <div>
                <p className="text-sm font-medium text-gray-600">Sección</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {venta.section || 'No especificada'}
                </p>
              </div>
            </div>

            {venta.section === 'delivery' && venta.selectedAddress && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dirección de entrega</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {typeof venta.selectedAddress === 'object' ? 
                      `${venta.selectedAddress.street || ''} ${venta.selectedAddress.number || ''}, ${venta.selectedAddress.city || ''}`.trim() :
                      venta.selectedAddress
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estado</p>
                <div className="mt-1">
                  {getStatusBadge(venta.status)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Método de Pago</p>
                <div className="mt-1">
                  {getPaymentMethodBadge(venta.payment)}
                </div>
              </div>
            </div>

            {venta.section === 'delivery' && venta.deliveryCost > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Costo de Delivery</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(venta.deliveryCost)}
                  </p>
                </div>
              </div>
            )}

            {venta.section === 'delivery' && venta.buyer?.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <UserIcon className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Teléfono de contacto</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {venta.buyer.phone}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productos del pedido */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Productos ({venta.foods?.length || 0})
          </h3>
          
          {venta.foods && venta.foods.length > 0 ? (
            <div className="space-y-3">
              {venta.foods.map((item, index) => {
                // Calcular precio unitario estimado desde el total del pedido
                const estimatedUnitPrice = venta.total && venta.foods.length === 1 ? 
                  venta.total / item.quantity : 
                  venta.total / venta.foods.reduce((sum, food) => sum + food.quantity, 0);
                
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-gray-900">
                          {typeof item.food === 'object' && item.food?.title ? 
                            item.food.title : 
                            `Producto ${index + 1}`
                          }
                        </span>
                        <span className="text-sm text-gray-500">
                          x{item.quantity}
                        </span>
                      </div>
                      {item.comment && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Comentario:</span> {item.comment}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {typeof item.food === 'object' && item.food?.price ? (
                        <>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(item.food.price * item.quantity)}
                          </p>
                        </>
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No hay productos en este pedido</p>
            </div>
          )}
        </div>

        {/* Comentarios adicionales */}
        {venta.comment && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Comentarios del pedido
            </h3>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700">{venta.comment}</p>
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
                        {getPaymentMethodBadge(venta.payment)}
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
                    {getPaymentMethodBadge(venta.payment)}
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
        <div className="flex justify-end gap-3 mt-6">
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
      </div>
    </Modal>
  );
};

export default VentaDetailModal;