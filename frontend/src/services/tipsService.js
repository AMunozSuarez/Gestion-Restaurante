import api from './api';

/**
 * Servicio para manejar las propinas
 */
const tipsService = {
    /**
     * Obtener propinas con filtros
     * @param {Object} filters - Filtros para las propinas
     * @returns {Promise<Object>} - Respuesta con propinas y estadísticas
     */
    getTips: async (filters = {}) => {
        try {
            const params = new URLSearchParams();
            
            // Agregar filtros a los parámetros
            if (filters.cashRegisterId) {
                params.append('cashRegisterId', filters.cashRegisterId);
            }
            if (filters.waiterId) {
                params.append('waiterId', filters.waiterId);
            }
            if (filters.dateFrom) {
                params.append('dateFrom', filters.dateFrom);
            }
            if (filters.dateTo) {
                params.append('dateTo', filters.dateTo);
            }
            if (filters.activeOnly) {
                params.append('activeOnly', 'true');
            }
            
            const response = await api.get(`/order/tips?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener propinas:', error);
            throw error;
        }
    },

    /**
     * Obtener estadísticas de propinas
     * @param {Object} filters - Filtros para las estadísticas
     * @returns {Promise<Object>} - Respuesta con estadísticas de propinas
     */
    getTipsStatistics: async (filters = {}) => {
        try {
            const params = new URLSearchParams();
            
            if (filters.dateFrom) {
                params.append('dateFrom', filters.dateFrom);
            }
            if (filters.dateTo) {
                params.append('dateTo', filters.dateTo);
            }
            if (filters.waiterId) {
                params.append('waiterId', filters.waiterId);
            }
            
            const response = await api.get(`/order/tips/statistics?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener estadísticas de propinas:', error);
            throw error;
        }
    }
};

export default tipsService;
