import { useState, useEffect } from 'react';
import { useCreateOrder } from './useCreateOrder'; // Hook para crear pedidos
import useCartStore from '../store/useCartStore'; // Store para manejar el carrito
import { useOrders } from './useOrders'; // Hook para manejar pedidos
import { useNavigate } from 'react-router-dom'; // Hook para navegación
import { closeOrder } from '../api/cashApi'; // Ajusta la ruta según tu estructura de archivos
import { updateOrder } from '../api/ordersApi';

export const useOrderForm = () => {
    const { createOrder } = useCreateOrder(); // Hook para manejar la creación de pedidos
    const { cart, setCart, cartTotal, clearCart } = useCartStore(); // Estado del carrito desde Zustand
    const { orders, setOrders, updateOrderInList } = useOrders(); // Obtener y actualizar el estado global de pedidos
    const [customerName, setCustomerName] = useState(''); // Estado para el nombre del cliente
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el teléfono del cliente
    const [deliveryAddress, setDeliveryAddress] = useState(''); // Estado para la dirección de entrega
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo'); // Estado para el método de pago
    const [editingOrderId, setEditingOrderId] = useState(null); // ID del pedido que se está editando
    const [deliveryCost, setDeliveryCost] = useState(''); // Estado para el costo de envío
    const [comment, setComment] = useState(''); // Estado para comentarios opcionales
    const navigate = useNavigate();

    // Cargar los datos del pedido seleccionado para editar
    useEffect(() => {
        if (editingOrderId) {
            console.log('Cargando datos del pedido para editar:', editingOrderId); // Depuración
            const orderToEdit = orders.find((order) => order._id === editingOrderId);
            if (orderToEdit) {
                setCustomerName(orderToEdit.buyer?.name || '');
                setCustomerPhone(orderToEdit.buyer?.phone || '');
                setDeliveryAddress(orderToEdit.selectedAddress || '');
                setDeliveryCost(orderToEdit.deliveryCost || 0);
                setSelectedPaymentMethod(orderToEdit.payment || 'Efectivo');
                setComment(orderToEdit.comment || orderToEdit.buyer?.comment || ''); // Priorizar el comentario del pedido
                console.log('Comentario cargado en useOrderForm:', orderToEdit.comment || orderToEdit.buyer?.comment); // Depuración
                setCart(
                    orderToEdit.foods.map((item) => ({
                        _id: item.food._id,
                        title: item.food.title,
                        quantity: item.quantity,
                        price: item.food.price,
                        comment: item.comment || '',
                    }))
                );
            }
        }
    }, [editingOrderId, orders, setCart]);
    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryAddress('');
        setSelectedPaymentMethod('Efectivo');
        setEditingOrderId(null);
        setDeliveryCost('');
        setComment(''); // Reiniciar el comentario
        setCart([]); // Limpiar el carrito
    };

    // Función para manejar el envío del formulario
    const handleSubmit = (e, resetForm, status = 'Preparacion', section = 'mostrador', extraData = {}) => {
        console.log('Editing Order ID:', editingOrderId); // Depuración
        if (e && e.preventDefault) e.preventDefault();

        const newOrder = {
            orderNumber: extraData.orderNumber || null,
            buyer: {
                name: customerName,
                phone: customerPhone,
                addresses: [
                    {
                        address: deliveryAddress,
                        deliveryCost: Number(deliveryCost) || 0,
                    },
                ],
                comment: comment || '', // Comentario opcional
            },
            selectedAddress: deliveryAddress,
            foods: cart.map((item) => ({
                food: item._id,
                quantity: item.quantity,
                comment: item.comment || '',
            })),
            payment: selectedPaymentMethod,
            section,
            status,
            comment: extraData.comment || comment || '', // Usar el comentario más reciente
            restaurant: extraData.restaurant || null, // ID del restaurante (opcional)
            total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + Number(deliveryCost), // Calcular el total
        };

        console.log('Datos preparados para enviar:', newOrder);
        console.log('Editing Order ID:', editingOrderId);

        if (editingOrderId) {
            console.log(`Editando pedido con ID: ${editingOrderId} y estado: ${status}`);
            // Actualizar el pedido existente
            updateOrder(editingOrderId, newOrder)
                .then(() => {
                    console.log('Pedido actualizado correctamente.');
                    if (typeof resetForm === 'function') resetForm();
                })
                .catch((error) => {
                    console.error('Error al actualizar el pedido:', error);
                    alert('Hubo un error al actualizar el pedido. Intente nuevamente.');
                });
            if (typeof resetForm === 'function') resetForm();
        } else {
            createOrder(newOrder, {
                onSuccess: () => {
                    if (typeof resetForm === 'function') resetForm();
                },
                onError: (error) => {
                    console.error('Error al crear el pedido:', error);
                    alert('Hubo un error al crear el pedido. Intente nuevamente.');
                },
            });
        }
    };

    // Función para cerrar el pedido
    const handleCloseOrder = async ({
        cart = [],
        cartTotal = 0,
        deliveryCost = 0,
        selectedPaymentMethod = '',
        editingOrderId = null,
    } = {}) => {
        try {
            if (!selectedPaymentMethod) {
                alert('Por favor, selecciona un método de pago.');
                return;
            }
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de cerrar el pedido.');
                return;
            }

            const orderData = {
                total: cartTotal + Number(deliveryCost),
                paymentMethod: selectedPaymentMethod,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    comment: item.comment || '', // Agregar comentario si existe
                })),
                deliveryCost: Number(deliveryCost),
            };

            console.log('Datos enviados al backend:', orderData);

            if (editingOrderId) {
                const response = await updateOrder(editingOrderId, orderData);
                if (response.status === 200) {
                } else {
                    throw new Error('Error al actualizar el pedido.');
                }
            } else {
                const response = await createOrder(orderData);
                if (response.status === 201) {
                } else {
                    throw new Error('Error al crear el pedido.');
                }
            }

            clearCart();
            resetForm();
            navigate('/delivery');
        } catch (error) {
            console.error('Error al cerrar el pedido:', error);
            alert('Hubo un error al cerrar el pedido. Inténtalo nuevamente.');
        }
    };

    // Función para registrar el pedido en la caja
    const handleRegisterOrderInCashRegister = async ({
        cart = [],
        cartTotal = 0,
        deliveryCost = 0,
        selectedPaymentMethod = '',
    } = {}) => {
        try {
            if (!selectedPaymentMethod) {
                alert('Por favor, selecciona un método de pago.');
                return;
            }
            if (cart.length === 0) {
                alert('El carrito está vacío. Agrega productos antes de cerrar el pedido.');
                return;
            }

            const orderData = {
                total: cartTotal + Number(deliveryCost),
                paymentMethod: selectedPaymentMethod,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    comment: item.comment || '', // Agregar comentario si existe
                })),
                deliveryCost: Number(deliveryCost),
            };

            console.log('Registrando pedido en la caja:', orderData);

            const response = await closeOrder(orderData); // Registrar en la caja
            if (response.status === 201) {
                console.log('Pedido registrado correctamente en la caja.');
            } else {
                console.error('Error inesperado al registrar el pedido en la caja:', response);
                throw new Error('Error al registrar el pedido en la caja.');
            }
        } catch (error) {
            console.error('Error al registrar el pedido en la caja:', error);
            throw error; // Propagar el error para que sea capturado en el botón
        }
    };

    // Función para actualizar el estado del pedido
    const handleUpdateOrderStatus = async (order) => {
        try {
            if (!order || !order._id) {
                alert('No se ha seleccionado un pedido para actualizar.');
                return;
            }

            console.log('Actualizando pedido con datos limpios:', order);

            const response = await updateOrder(order._id, order); // Enviar los datos limpios
            console.log('Respuesta del backend:', response);


            // Actualizar el pedido en la lista de pedidos
            updateOrderInList(response.order);       
        } catch (error) {
            console.error('Error al actualizar el pedido:', error);
            throw error; // Propagar el error para que sea capturado en el botón
        }
    };

    return {
        editingOrderId,
        setEditingOrderId,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        deliveryAddress,
        setDeliveryAddress,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        deliveryCost,
        setDeliveryCost,
        comment,
        setComment,
        resetForm,
        handleCloseOrder, // Exportar la función
        handleRegisterOrderInCashRegister, // Exportar la nueva función
        handleUpdateOrderStatus, // Exportar la función para actualizar el estado del pedido
    };
};