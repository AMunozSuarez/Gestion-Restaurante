import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    // Mutación para crear un pedido
    const mutation = useMutation({
        mutationFn: async (newOrder) => {
            try {
                const response = await axios.post('/order/create', newOrder);
                console.log('Pedido creado:', response.data.order);
                return response.data;
                
            } catch (error) {
                console.error('Error en la solicitud al backend:', error.response?.data || error.message);
                throw error;
            }
        },
        onSuccess: () => {
            // Refrescar la lista de pedidos después de crear uno nuevo
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    return {
        createOrder: mutation.mutate, // Función para crear un pedido
        isLoading: mutation.isLoading, // Estado de carga
        error: mutation.error, // Error en la creación
    };
};
