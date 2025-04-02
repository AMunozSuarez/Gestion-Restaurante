import { useQuery } from '@tanstack/react-query';
import axios from '../services/axiosConfig';

export const useCategories = () => {
    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories'], // Clave única para identificar esta consulta
        queryFn: async () => {
            const response = await axios.get('/category/getAll'); // Cambia la URL según tu backend
            return response.data.categories;
        },
    });

    return { categories, isLoading, error };
};