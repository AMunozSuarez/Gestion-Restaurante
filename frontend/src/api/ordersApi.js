import axios from '../services/axiosConfig';

export const updateOrder = async (orderId, updatedOrder) => {
    try {
        const response = await axios.put(`/order/update/${orderId}`, updatedOrder);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar el pedido:', error);
        throw error;
    }
};