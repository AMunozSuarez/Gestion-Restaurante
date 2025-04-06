import { useQuery } from '@tanstack/react-query';
import axios from '../services/axiosConfig';

export const useProducts = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['products'], // Clave única para identificar esta consulta
        queryFn: async () => {
            const response = await axios.get('/food/getAll'); // Cambia la URL según tu backend
            console.log('Respuesta de la API:', response.data); // Depuración
            // Verifica que la respuesta tenga la estructura esperada
            if (!response.data || !response.data.foods) {
                throw new Error('La respuesta de la API no contiene productos');
            }
            return response.data.foods; // Devuelve el array de productos desde la propiedad "foods"
        },
    });

    return { products: data, isLoading, error };
};