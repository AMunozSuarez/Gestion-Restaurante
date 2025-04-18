import React, { useEffect, useState, useRef } from 'react';
import axios from '../../services/axiosConfig'; // Asegúrate de tener axios instalado
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders'; // Hook para manejar pedidos
import useCartStore from '../../store/useCartStore'; // Store para manejar el carrito
import OrderFormDelivery from '../forms/orderFormDelivery'; // Formulario para crear/editar pedidos de delivery
import OrderListDelivery from '../lists/orderListDelivery'; // Lista de pedidos en preparación
import CompletedOrdersList from '../lists/completedOrdersList'; // Lista de pedidos completados/cancelados
import { CSSTransition } from 'react-transition-group'; // Importar CSSTransition
import '../../styles/deliveryDetails.css'; // Estilos específicos de delivery

const DeliveryDetails = () => {
    const { orderNumber } = useParams();
    const { orders, updateOrderInList } = useOrders();
    const { cart, setCart, clearCart } = useCartStore();
    const [editingOrder, setEditingOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
    const [isViewingCompletedOrder, setIsViewingCompletedOrder] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null); // Nuevo estado
    const [localCart, setLocalCart] = useState([]);
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!orders || orders.length === 0) return; // Espera a que los pedidos estén cargados

        const foundOrder = orders.find((o) => o.orderNumber === parseInt(orderNumber, 10));
        setEditingOrder(foundOrder || null);

        if (foundOrder) {
            const cartItems = foundOrder.foods.map((item) => ({
                _id: item.food._id,
                title: item.food.title,
                quantity: item.quantity,
                price: item.food.price,
            }));
            setCart(cartItems);
            setCustomerName(foundOrder.buyer);
            setDeliveryAddress(foundOrder.deliveryAddress || '');
            setSelectedPaymentMethod(foundOrder.payment);

            if (foundOrder.status === 'Enviado' || foundOrder.status === 'Entregado') {
                setIsViewingCompletedOrder(true);
            } else {
                setIsViewingCompletedOrder(false);
            }
        } else {
            setEditingOrder(null);
            clearCart();
        }
    }, [orderNumber, orders]);

    // Sincroniza el carrito local con el store global solo cuando sea necesario
    useEffect(() => {
        setCart(localCart);
    }, [localCart, setCart]);

    const handleSelectCompletedOrder = (order) => {
        setEditingOrder(order);
        setCustomerName(order.buyer);
        setDeliveryAddress(order.deliveryAddress || '');
        setSelectedPaymentMethod(order.payment);

        const cartItems = order.foods.map((item) => ({
            _id: item.food._id,
            title: item.food.title,
            quantity: item.quantity,
            price: item.food.price,
        }));
        setCart(cartItems);

        setIsViewingCompletedOrder(true);
        setSelectedOrderId(order._id); // Establecer el pedido seleccionado

        // Navegar a la URL del pedido seleccionado
        navigate(`/delivery/${order.orderNumber}`);
    };

    const handleSubmit = async (e, status = 'Preparacion') => {
        if (e && e.preventDefault) e.preventDefault(); // Verificar si 'e' existe antes de llamar a preventDefault

        if (isViewingCompletedOrder) return; // No permitir guardar en modo de solo visualización

        const updatedOrder = {
            ...editingOrder,
            buyer: customerName,
            deliveryAddress,
            payment: selectedPaymentMethod,
            foods: cart.map((item) => ({
                food: item._id,
                quantity: item.quantity,
                price: item.price,
            })),
            status, // Usar el estado pasado como argumento
        };

        try {
            const response = await axios.put(`/order/update/${editingOrder._id}`, updatedOrder);

            if (response.status === 200) {
                if (response.data.order && response.data.order._id) {
                    updateOrderInList(response.data.order);
                }
                navigate('/delivery');
            } else {
                alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
            }
        } catch (error) {
            alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
        }
    };

    const preparationOrders = orders.filter(
        (order) => order.section === 'delivery' && order.status === 'Preparacion'
    );
    const completedOrders = orders.filter(
        (order) =>
            order.section === 'delivery' &&
            (order.status === 'Enviado' || order.status === 'Entregado')
    );

    return (
        <CSSTransition
            in={!!editingOrder}
            timeout={300}
            classNames="fade"
            unmountOnExit
            nodeRef={containerRef}
        >
            <div ref={containerRef} className="delivery-container editing-mode">
                <div className="delivery-content">
                    <div className="delivery-orders-list">
                        <OrderListDelivery orders={preparationOrders} />
                    </div>
                    <div className="delivery-edit-order">
                        {editingOrder ? (
                            <OrderFormDelivery
                                customerName={customerName}
                                setCustomerName={setCustomerName}
                                deliveryAddress={deliveryAddress}
                                setDeliveryAddress={setDeliveryAddress}
                                selectedPaymentMethod={selectedPaymentMethod}
                                setSelectedPaymentMethod={setSelectedPaymentMethod}
                                handleSubmit={handleSubmit}
                                editingOrderId={editingOrder._id}
                                isViewingCompletedOrder={isViewingCompletedOrder} // Pasar el estado
                            />
                        ) : (
                            <p>Selecciona un pedido para ver los detalles.</p>
                        )}
                    </div>
                </div>
                <div className="delivery-completed-orders">
                    <CompletedOrdersList
                        orders={completedOrders}
                        onSelectOrder={handleSelectCompletedOrder} // Pasar la función
                        selectedOrderId={selectedOrderId} // Pasar el pedido seleccionado
                    />
                </div>
            </div>
        </CSSTransition>
    );
};

export default DeliveryDetails;