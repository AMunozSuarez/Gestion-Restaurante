import { useState, useEffect } from 'react';
import { getCurrentSubscription } from '../services/subscriptionService';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await getCurrentSubscription();
      
      if (response.success && response.data && response.data.subscription) {
        const sub = response.data.subscription;
        setSubscription(sub);
        
        // Considerar como activa si el estado es 'active' o 'trial'
        const isActive = sub.status === 'active' || sub.status === 'trial';
        setHasActiveSubscription(isActive);
      } else {
        setSubscription(null);
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('Error al verificar suscripción:', error);
      setSubscription(null);
      setHasActiveSubscription(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    checkSubscription();
  };

  return {
    subscription,
    hasActiveSubscription,
    isLoading,
    refresh
  };
};
