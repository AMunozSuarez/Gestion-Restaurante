import { useQuery } from '@tanstack/react-query';
import axios from '../services/axiosConfig';

export const useCategories = () => {
    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axios.get('/category/getAll'); // La URL debe coincidir con el backend
            return response.data.categories;
        },
    });

    return { categories, isLoading, error };
};