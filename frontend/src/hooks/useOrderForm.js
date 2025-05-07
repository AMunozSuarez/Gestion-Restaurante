import { useState, useEffect } from 'react';
import { useCreateOrder } from './useCreateOrder'; // Hook para crear pedidos
import useCartStore from '../store/useCartStore'; // Store para manejar el carrito
import { useOrders } from './useOrders'; // Hook para manejar pedidos

export const useOrderForm = () => {
    const { createOrder } = useCreateOrder(); // Hook para manejar la creación de pedidos
    const { cart, setCart } = useCartStore(); // Estado del carrito desde Zustand
    const { orders } = useOrders(); // Obtener pedidos existentes
    const [customerName, setCustomerName] = useState(''); // Estado para el nombre del cliente
    const [customerPhone, setCustomerPhone] = useState(''); // Estado para el teléfono del cliente
    const [deliveryAddress, setDeliveryAddress] = useState(''); // Estado para la dirección de entrega
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo'); // Estado para el método de pago
    const [editingOrderId, setEditingOrderId] = useState(null); // ID del pedido que se está editando
    const [deliveryCost, setDeliveryCost] = useState(''); // Estado para el costo de envío
    const [comment, setComment] = useState(''); // Estado para comentarios opcionales

    // Cargar los datos del pedido seleccionado para editar
    useEffect(() => {
        if (editingOrderId) {
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

        if (editingOrderId) {
            console.log(`Editando pedido con ID: ${editingOrderId} y estado: ${status}`);
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
    };
};