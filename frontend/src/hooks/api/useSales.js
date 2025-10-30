import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';

// Función para obtener ventas/órdenes históricas (sin filtro de caja)
const fetchSales = async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.date) params.set('date', filters.date);
    if (filters.status) params.set('status', filters.status);
    if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
    
    const response = await axios.get(`/order/sales?${params.toString()}`);
    return response.data.orders || [];
};

// Hook personalizado para manejar ventas históricas
export const useSales = (filters = {}) => {
    const queryClient = useQueryClient();

    // Obtener ventas
    const { data: orders = [], isLoading, error, refetch } = useQuery({
        queryKey: ['sales', filters],
        queryFn: () => fetchSales(filters),
    });

    // Actualizar una orden en la lista
    const updateOrderInList = (updatedOrder) => {
        if (!updatedOrder || !updatedOrder._id) {
            console.error('updatedOrder no tiene un _id válido:', updatedOrder);
            return;
        }

        queryClient.setQueryData(['sales', filters], (oldOrders) => {
            if (!oldOrders || !Array.isArray(oldOrders)) {
                console.error('oldOrders no es un array:', oldOrders);
                return [updatedOrder];
            }

            return oldOrders.map((order) =>
                order._id === updatedOrder._id ? updatedOrder : order
            );
        });
    };

    return { orders, isLoading, error, updateOrderInList, refetch };
};
