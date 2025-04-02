import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../services/axiosConfig';

// Función para obtener pedidos
const fetchOrders = async () => {
    const response = await axios.get('/order/getAll');
    return response.data.orders;
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

    // Actualizar estado de un pedido
    const mutation = useMutation({
        mutationFn: updateOrderStatus, // Función para realizar la mutación
        onSuccess: () => {
            // Refrescar los datos de pedidos después de una actualización
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    return {
        orders,
        isLoading,
        error,
        updateOrderStatus: mutation.mutate, // Función para actualizar pedidos
    };
};