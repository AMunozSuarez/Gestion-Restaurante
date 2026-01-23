import { useState, useEffect, useCallback } from 'react';
import usersService from '../services/usersService';

export const useUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await usersService.getUsersByRestaurant();
            if (response.success) {
                setUsers(response.data);
                setError(null);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching users:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        isLoading,
        error,
        refetch: fetchUsers,
    };
};

// Hook para obtener todos los usuarios como posibles meseros (cualquier rol)
export const useWaiters = () => {
    const { users, isLoading, error, refetch } = useUsers();

    return {
        waiters: users,
        isLoading,
        error,
        refetch,
    };
};
