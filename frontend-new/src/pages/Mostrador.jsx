import React from 'react';
import { Button } from '../components/ui';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useOrders, useRecentOrders } from '../hooks/useOrders';
import { useCashRegister } from '../hooks/useCashRegister';
import CashRegisterAlert from '../components/common/CashRegisterAlert';

const Mostrador = () => {
  // Estado para crear pedido
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [showCashAlert, setShowCashAlert] = React.useState(false);
  
  // Hook para caja registradora
  const { 
    isOpen: isCashOpen, 
    isLoading: cashLoading, 
    openCashRegister 
  } = useCashRegister();
  
  // Hooks para obtener datos reales
  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError,
    updateOrderStatus 
  } = useOrders({ 
    section: 'mostrador', 
    status: 'Preparacion' 
  });

  const { 
    orders: completedOrders, 
    isLoading: completedLoading 
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

  const handleCompleteOrder = async (orderId) => {
    const result = await updateOrderStatus(orderId, 'Completado');
    if (!result.success) {
      alert('Error al completar el pedido: ' + result.error);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const result = await updateOrderStatus(orderId, 'Cancelado');
    if (!result.success) {
      alert('Error al cancelar el pedido: ' + result.error);
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
        <div className="flex justify-between items-center flex-shrink-0">
          <h1 className="text-professional-title">Mostrador</h1>
          <Button
            onClick={() => setIsCreatingOrder(!isCreatingOrder)}
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
                    />
                    <button className="w-full btn-professional-outline">
                      Ver Productos
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Carrito
                    </label>
                    <div className="product-list min-h-[100px] flex items-center justify-center">
                      <p className="text-professional-body text-center text-sm">El carrito está vacío</p>
                    </div>
                  </div>

                  <div className="total-highlight">
                    <div className="flex justify-between text-lg">
                      <span>Total:</span>
                      <span>$0</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-professional-body mb-1">
                      Método de Pago
                    </label>
                    <select className="input-professional">
                      <option value="">Seleccionar método</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>

                  {/* Botón al final del scroll */}
                  <div className="pt-3">
                    <button className="w-full btn-professional-primary">
                      Crear Pedido
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Columna derecha - Lista de pedidos con altura controlada */}
        <div className={`${isCreatingOrder ? 'flex-1' : 'w-full'} flex flex-col gap-3 min-h-0`}>
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
                      key={order.id} 
                      className="grid grid-cols-6 gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md bg-yellow-50 hover:bg-yellow-100"
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
                        {order.buyer?.name || order.customerName}
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
                        order.status === 'Completado' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                      } border-l-4 ${
                        order.status === 'Completado' ? 'border-green-500' : 'border-red-500'
                      }`}
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
                        {(order.buyer?.name || order.customerName)?.toUpperCase()}
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
        </div>
      </div>

      {/* Alerta de caja registradora */}
      <CashRegisterAlert
        isOpen={showCashAlert}
        onClose={() => setShowCashAlert(false)}
        onOpenCashRegister={handleOpenCash}
      />
    </>
  );
};

export default Mostrador;