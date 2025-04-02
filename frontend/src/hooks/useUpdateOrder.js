import { useMutation } from '@tanstack/react-query'; // Usar TanStack Query para manejar la mutación
import axios from 'axios'; // Cliente HTTP para realizar solicitudes al backend

export const useUpdateOrder = () => {
    const updateOrder = async (orderId, updatedOrder) => {
        const response = await axios.put(`/api/orders/${orderId}`, updatedOrder);
        return response.data;
    };

    return useMutation(updateOrder);
};