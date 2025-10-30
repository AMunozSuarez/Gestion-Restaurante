import { useState, useEffect } from 'react';
import { getCurrentCashRegister } from '../../api/cashApi';

/**
 * Hook para verificar el estado de la caja registradora
 * @returns {Object} - Estado de la caja (hasOpenCashRegister, isLoading, error, checkCashRegister)
 */
export const useCashRegisterStatus = () => {
    const [hasOpenCashRegister, setHasOpenCashRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cashRegisterData, setCashRegisterData] = useState(null);

    const checkCashRegister = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await getCurrentCashRegister();
            
            if (response.data.success && response.data.cashRegister) {
                setHasOpenCashRegister(true);
                setCashRegisterData(response.data.cashRegister);
            } else {
                setHasOpenCashRegister(false);
                setCashRegisterData(null);
            }
        } catch (err) {
            // Si el error es 404, significa que no hay caja abierta
            if (err.response?.status === 404) {
                setHasOpenCashRegister(false);
                setCashRegisterData(null);
            } else {
                setError(err.message || 'Error al verificar la caja registradora');
                setHasOpenCashRegister(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkCashRegister();
    }, []);

    return {
        hasOpenCashRegister,
        isLoading,
        error,
        cashRegisterData,
        checkCashRegister, // Permitir verificación manual
    };
};
