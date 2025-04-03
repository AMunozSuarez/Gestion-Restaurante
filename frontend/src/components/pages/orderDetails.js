import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import OrderForm from '../forms/orderForm'; // Formulario para crear/editar pedidos
import OrderList from '../lists/orderList'; // Lista de pedidos en preparación
import CompletedOrdersList from '../lists/completedOrdersList'; // Lista de pedidos completados/cancelados
import axios from 'axios'; // Asegúrate de tener axios instalado
import { useQueryClient } from '@tanstack/react-query'; // Para invalidar la caché de pedidos
import { CSSTransition } from 'react-transition-group'; // Importar CSSTransition
import '../../styles/orderDetails.css'; // Estilos específicos del mostrador

const OrderDetails = () => {
    const { orderNumber } = useParams(); // Obtener el número de pedido desde la URL
    const { orders, updateOrderInList } = useOrders(); // Obtener la lista de pedidos
    const { cart, setCart, setCartContext } = useCartStore(); // Estado del carrito
    const [editingOrder, setEditingOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
    const navigate = useNavigate();
    const queryClient = useQueryClient(); // Para invalidar la caché de pedidos

    // Ref para el contenedor animado
    const containerRef = useRef(null);

    // Buscar el pedido seleccionado y actualizar el estado
    useEffect(() => {
        setCartContext('edit'); // Establecer el contexto como "edit"

        const foundOrder = orders.find((o) => o.orderNumber === parseInt(orderNumber, 10));
        setEditingOrder(foundOrder || null);

        if (foundOrder) {
            // Actualizar el carrito con los datos del pedido seleccionado
            const cartItems = foundOrder.foods.map((item) => ({
                _id: item.food._id, // ID del producto
                title: item.food.title, // Título del producto
                quantity: item.quantity, // Cantidad
                price: item.food.price, // Precio del producto
            }));
            setCart(cartItems);

            // Actualizar el nombre del cliente y el método de pago
            setCustomerName(foundOrder.buyer);
            setSelectedPaymentMethod(foundOrder.payment);
        }
    }, [orderNumber, orders, setCart]);

    // Función para manejar el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedOrder = {
            ...editingOrder,
            buyer: customerName,
            payment: selectedPaymentMethod,
            foods: cart.map((item) => ({
                food: item._id,
                quantity: item.quantity,
                price: item.price,
            })),
        };

        try {
            const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

            if (response.status === 200) {
                alert('Pedido actualizado correctamente.');
                console.log('Pedido actualizado en la base de datos:', response.data);

                // Validar que el pedido actualizado tenga un _id antes de actualizar la lista
                if (response.data.order && response.data.order._id) {
                    updateOrderInList(response.data.order); // Usar el campo "order"
                } else {
                    console.error('El pedido actualizado no tiene un _id válido:', response.data.order);
                }

                // Invalidar la caché de pedidos para forzar la recarga
                queryClient.invalidateQueries(['orders']);

                navigate('/mostrador');
            } else {
                console.error('Error al actualizar el pedido:', response.data);
                alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
            }
        } catch (error) {
            console.error('Error al realizar la solicitud al backend:', error);
            alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
        }
    };

    // Filtrar pedidos en preparación y completados/cancelados
    const preparationOrders = orders.filter((order) => order.status === 'Preparacion');
    const completedOrders = orders.filter(
        (order) => order.status === 'Completado' || order.status === 'Cancelado'
    );

    return (
        <CSSTransition
            in={!!editingOrder} // Mostrar solo si hay un pedido en edición
            timeout={300} // Duración de la animación
            classNames="fade" // Clases CSS para la animación
            unmountOnExit // Desmontar el componente después de la animación de salida
            nodeRef={containerRef} // Usar el ref explícito
        >
            <div ref={containerRef} className="mostrador-container editing-mode">
                <h2>Detalles del Pedido</h2>
                <div className="mostrador-content">
                    <div className="mostrador-orders-list">
                        <OrderList orders={preparationOrders} />
                    </div>
                    <div className="mostrador-edit-order">
                        {editingOrder ? (
                            <OrderForm
                                customerName={customerName}
                                setCustomerName={setCustomerName}
                                selectedPaymentMethod={selectedPaymentMethod}
                                setSelectedPaymentMethod={setSelectedPaymentMethod}
                                handleSubmit={handleSubmit}
                                editingOrderId={editingOrder._id}
                                setEditingOrderId={() => {}}
                                isViewingCompletedOrder={false}
                            />
                        ) : (
                            <p>Selecciona un pedido para ver los detalles.</p>
                        )}
                    </div>
                </div>
                <div className="mostrador-completed-orders">
                    <CompletedOrdersList orders={completedOrders} />
                </div>
            </div>
        </CSSTransition>
    );
};

export default OrderDetails;