import { useQuery } from '@tanstack/react-query';
import axios from '../../services/axiosConfig';

const fetchRecent = async ({ queryKey }) => {
    // queryKey: ['recentOrders', { limit, status, section }]
    const [, params] = queryKey;
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', params.limit);
    if (params?.status) qs.set('status', params.status);
    if (params?.section) qs.set('section', params.section);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);

    const url = `/order/recent?${qs.toString()}`;
    const resp = await axios.get(url);
    return resp.data.orders || [];
};

export const useRecentOrders = (params = { limit: 10, sortBy: 'updatedAt' }) => {
    const { data = [], isLoading, error } = useQuery({
        queryKey: ['recentOrders', params],
        queryFn: fetchRecent,
    });

    return { orders: data, isLoading, error };
};
