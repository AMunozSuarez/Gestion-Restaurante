import { useState, useEffect } from 'react';
import restaurantService from '../services/restaurantService';
import { useAuth } from './useAuth';

export const useRestaurant = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  const fetchRestaurant = async () => {
    if (!isAuthenticated || !user?.restaurant) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await restaurantService.getCurrentRestaurant();
      
      if (response.success) {
        setRestaurant(response.restaurant);
      } else {
        setError(response.message || 'No se pudo obtener la información del restaurante');
      }
    } catch (error) {
      setError(error.message);
      setRestaurant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurant();
  }, [user?.restaurant, isAuthenticated]);

  return {
    restaurant,
    isLoading,
    error,
    refetch: fetchRestaurant
  };
};

export default useRestaurant;