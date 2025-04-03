import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../services/axiosConfig';

// Función para obtener pedidos
const fetchOrders = async () => {
    const response = await axios.get('/order/getAll');
    return response.data.orders || []; // Devuelve un array vacío si no hay pedidos
};

// Función para actualizar el estado de un pedido
const updateOrderStatus = async ({ orderId, newStatus }) => {
    await axios.put(`/order/update/${orderId}`, { status: newStatus });
};

// Hook personalizado para manejar pedidos
export const useOrders = () => {
    const queryClient = useQueryClient();

    // Obtener pedidos
    const { data: orders = [], isLoading, error } = useQuery({
        queryKey: ['orders'], // Clave única para identificar esta consulta
        queryFn: fetchOrders, // Función que realiza la solicitud
    });

    // Actualizar un pedido en la lista
    const updateOrderInList = (updatedOrder) => {
        if (!updatedOrder || !updatedOrder._id) {
            console.error('updatedOrder no tiene un _id válido:', updatedOrder);
            return;
        }

        queryClient.setQueryData(['orders'], (oldOrders) => {
            if (!oldOrders || !Array.isArray(oldOrders)) {
                console.error('oldOrders no es un array:', oldOrders);
                return [updatedOrder]; // Si no hay pedidos, devuelve solo el actualizado
            }

            return oldOrders.map((order) =>
                order._id === updatedOrder._id ? updatedOrder : order
            );
        });
    };

    return { orders, isLoading, error, updateOrderInList };
};