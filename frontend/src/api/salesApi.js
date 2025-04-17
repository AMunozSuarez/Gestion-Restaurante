import axios from '../services/axiosConfig';

export const getSales = async (filters) => {
    const token = localStorage.getItem('token'); // Obtener el token del almacenamiento local
    const params = new URLSearchParams(filters).toString();
    return await axios.get(`/order/sales?${params}`, {
        headers: {
            Authorization: `Bearer ${token}`, // Enviar el token en el encabezado
        },
    });
};