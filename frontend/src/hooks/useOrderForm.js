import { useState, useEffect } from 'react';
import { useCreateOrder } from './useCreateOrder'; // Hook para crear pedidos
import useCartStore from '../store/useCartStore'; // Store para manejar el carrito
import { useOrders } from './useOrders'; // Hook para manejar pedidos

export const useOrderForm = () => {
    const { createOrder } = useCreateOrder(); // Hook para manejar la creación de pedidos
    const { cart, setCart } = useCartStore(); // Estado del carrito desde Zustand
    const { orders } = useOrders(); // Obtener pedidos existentes
    const [customerName, setCustomerName] = useState(''); // Estado para el nombre del cliente
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo'); // Estado para el método de pago
    const [editingOrderId, setEditingOrderId] = useState(null); // ID del pedido que se está editando

    // Cargar los datos del pedido seleccionado para editar
    useEffect(() => {
        if (editingOrderId) {
            const orderToEdit = orders.find((order) => order._id === editingOrderId);
            if (orderToEdit) {
                setCustomerName(orderToEdit.buyer);
                setSelectedPaymentMethod(orderToEdit.payment);
                setCart(
                    orderToEdit.foods.map((item) => ({
                        _id: item.food, // ID del producto
                        title: item.food.title, // Título del producto
                        quantity: item.quantity, // Cantidad
                        price: item.food.price, // Precio del producto
                    }))
                );
            }
        }
    }, [editingOrderId, orders, setCart]);

    // Función para manejar el envío del formulario
    const handleSubmit = (e, resetForm, status = 'Preparacion', section = 'mostrador') => {
        if (e && e.preventDefault) e.preventDefault(); // Verificar si 'e' existe antes de llamar a preventDefault

        const newOrder = {
            section, // Ahora la sección se pasa como argumento
            buyer: customerName,
            payment: selectedPaymentMethod,
            foods: cart.map((item) => ({
                food: item._id,
                quantity: item.quantity,
            })),
            status,
        };

        if (editingOrderId) {
            console.log(`Editando pedido con ID: ${editingOrderId} y estado: ${status}`);
            // Aquí puedes implementar la lógica para actualizar el pedido en el backend
            resetForm(); // Volver al estado de "Crear Pedido"
        } else {
            createOrder(newOrder, {
                onSuccess: () => {
                    resetForm(); // Volver al estado de "Crear Pedido"
                },
                onError: (error) => {
                    console.error('Error al crear el pedido:', error);
                    alert('Hubo un error al crear el pedido. Intente nuevamente.');
                },
            });
        }
    };

    return {
        customerName,
        setCustomerName,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        handleSubmit,
        editingOrderId,
        setEditingOrderId,
    };
};