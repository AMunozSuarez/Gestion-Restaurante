import { useState, useEffect, useCallback } from 'react';
import tipsService from '../services/tipsService';

/**
 * Hook personalizado para manejar propinas
 * @param {Object} filters - Filtros para las propinas
 * @returns {Object} - Propinas, estadísticas, loading, error y refetch
 */
export const useTips = (filters = {}) => {
    const [tips, setTips] = useState([]);
    const [statistics, setStatistics] = useState({
        totalTips: 0,
        totalOrders: 0,
        averageTip: 0,
        tipsByWaiter: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTips = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await tipsService.getTips(filters);
            
            if (response.success) {
                setTips(response.tips || []);
                setStatistics(response.statistics || {
                    totalTips: 0,
                    totalOrders: 0,
                    averageTip: 0,
                    tipsByWaiter: []
                });
            } else {
                setError(response.message || 'Error al obtener propinas');
            }
        } catch (err) {
            console.error('Error fetching tips:', err);
            setError(err.message || 'Error al obtener propinas');
            setTips([]);
            setStatistics({
                totalTips: 0,
                totalOrders: 0,
                averageTip: 0,
                tipsByWaiter: []
            });
        } finally {
            setIsLoading(false);
        }
    }, [filters.cashRegisterId, filters.waiterId, filters.dateFrom, filters.dateTo, filters.activeOnly]);

    useEffect(() => {
        fetchTips();
    }, [fetchTips]);

    return {
        tips,
        statistics,
        isLoading,
        error,
        refetch: fetchTips
    };
};

export default useTips;
