import React from 'react';
import { Card, Button, Badge } from '../components/ui';
import { PlusIcon, TruckIcon, MapIcon } from '@heroicons/react/24/outline';

const Delivery = () => {
  // Estado temporal para mostrar el diseño
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  const [orders] = React.useState([
    {
      id: 1,
      orderNumber: 'D001',
      customerName: 'Ana Martínez',
      customerPhone: '+591 70123456',
      address: 'Av. Ballivián #1234, Zona Central',
      items: [
        { name: 'Pizza Familiar', quantity: 1, price: 25.99 },
        { name: 'Refresco 2L', quantity: 2, price: 8.99 }
      ],
      subtotal: 43.97,
      deliveryCost: 5.00,
      total: 48.97,
      status: 'Preparando',
      createdAt: '2024-11-04T10:30:00Z'
    },
    {
      id: 2,
      orderNumber: 'D002',
      customerName: 'Roberto Silva',
      customerPhone: '+591 75987654',
      address: 'Calle Comercio #567, Zona Norte',
      items: [
        { name: 'Combo Familiar', quantity: 1, price: 35.50 }
      ],
      subtotal: 35.50,
      deliveryCost: 3.00,
      total: 38.50,
      status: 'Pendiente',
      createdAt: '2024-11-04T11:15:00Z'
    }
  ]);

  const [completedOrders] = React.useState([
    {
      id: 3,
      orderNumber: 'D003',
      customerName: 'Lucía Fernández',
      address: 'Av. 6 de Agosto #890',
      total: 32.75,
      status: 'Entregado',
      deliveredAt: '2024-11-04T09:45:00Z'
    }
  ]);

  const getStatusVariant = (status) => {
    const variants = {
      'Pendiente': 'warning',
      'Preparando': 'preparing',
      'En camino': 'primary',
      'Entregado': 'completed',
      'Cancelado': 'cancelled'
    };
    return variants[status] || 'default';
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-6">
      {/* Header con botón crear pedido */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brown-900 flex items-center gap-2">
          <TruckIcon className="w-8 h-8" />
          Delivery
        </h1>
        <Button
          onClick={() => setIsCreatingOrder(!isCreatingOrder)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {isCreatingOrder ? 'Cancelar' : 'Nuevo Pedido'}
        </Button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Columna izquierda - Formulario de creación (cuando está activo) */}
        {isCreatingOrder && (
          <div className="w-1/3 animate-slide-in-left">
            <Card className="h-full flex flex-col" padding="lg">
              <h2 className="text-lg font-semibold text-brown-900 mb-4">
                Nuevo Pedido - Delivery
              </h2>
              
              {/* Formulario temporal */}
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ingrese el nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+591 70123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1 flex items-center gap-1">
                    <MapIcon className="w-4 h-4" />
                    Dirección de Entrega
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Ingrese la dirección completa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Método de Pago
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Seleccionar método</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Productos
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 h-32 overflow-y-auto">
                    <p className="text-gray-500 text-center">
                      Seleccione productos del menú
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo de envío:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>$0.00</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">
                  Borrador
                </Button>
                <Button className="flex-1">
                  Crear Pedido
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Columna derecha - Lista de pedidos */}
        <div className={`${isCreatingOrder ? 'w-2/3' : 'w-full'} flex flex-col gap-6`}>
          {/* Pedidos activos */}
          <div className="flex-1">
            <Card className="h-full flex flex-col" padding="lg">
              <h2 className="text-lg font-semibold text-brown-900 mb-4 flex items-center gap-2">
                <TruckIcon className="w-5 h-5" />
                Pedidos Activos ({orders.length})
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-brown-900">
                          #{order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.customerPhone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatTime(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 flex items-start gap-1">
                        <MapIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {order.address}
                      </p>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-1 text-sm border-t pt-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Envío:</span>
                        <span>${order.deliveryCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total:</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary">
                          En camino
                        </Button>
                      </div>
                      <Button size="sm">
                        Entregar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Pedidos entregados recientes */}
          <div className="h-80">
            <Card className="h-full flex flex-col" padding="lg">
              <h2 className="text-lg font-semibold text-brown-900 mb-4">
                Entregados Recientes ({completedOrders.length})
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-brown-900">
                          #{order.orderNumber}
                        </h4>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.address}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                        <p className="text-sm text-gray-500">
                          ${order.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delivery;