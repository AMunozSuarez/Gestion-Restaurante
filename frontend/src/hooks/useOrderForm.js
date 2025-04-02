import { useState, useEffect } from 'react';
import { useCreateOrder } from './useCreateOrder'; // Hook para crear pedidos
import useCartStore from '../store/useCartStore'; // Store para manejar el carrito
import { useOrders } from './useOrders'; // Hook para manejar pedidos

export const useOrderForm = () => {
    const { createOrder } = useCreateOrder(); // Hook para manejar la creación de pedidos
    const { cart, setCart, clearCart } = useCartStore(); // Estado del carrito desde Zustand
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
    const handleSubmit = (e) => {
        e.preventDefault();

        const newOrder = {
            section: 'mostrador',
            buyer: customerName, // Nombre del cliente
            payment: selectedPaymentMethod, // Método de pago
            customerPhone: '123456789', // Número de teléfono (puedes hacerlo dinámico)
            foods: cart.map((item) => ({
                food: item._id, // ID del producto
                quantity: item.quantity, // Cantidad
            })),
            status: 'Preparacion', // Estado por defecto
        };

        console.log('Datos enviados al backend:', newOrder); // Depuración

        if (editingOrderId) {
            // Lógica para actualizar un pedido existente
            console.log(`Actualizando pedido con ID: ${editingOrderId}`);
            // Aquí puedes implementar la lógica para actualizar el pedido en el backend
        } else {
            // Crear un nuevo pedido
            createOrder(newOrder, {
                onSuccess: () => {
                    setCustomerName('');
                    clearCart();
                    setSelectedPaymentMethod('Efectivo');
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