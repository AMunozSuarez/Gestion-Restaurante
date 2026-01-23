import api from './api';

const tablesService = {
    // Obtener todas las mesas
    getTables: async () => {
        try {
            const response = await api.get('/tables');
            return response.data;
        } catch (error) {
            console.error('Error al obtener mesas:', error);
            throw error;
        }
    },

    // Obtener mesa por ID
    getTableById: async (id) => {
        try {
            const response = await api.get(`/tables/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error al obtener mesa:', error);
            throw error;
        }
    },

    // Crear nueva mesa
    createTable: async (tableData) => {
        try {
            const response = await api.post('/tables', tableData);
            return response.data;
        } catch (error) {
            console.error('Error al crear mesa:', error);
            throw error;
        }
    },

    // Actualizar mesa
    updateTable: async (id, tableData) => {
        try {
            const response = await api.put(`/tables/${id}`, tableData);
            return response.data;
        } catch (error) {
            console.error('Error al actualizar mesa:', error);
            throw error;
        }
    },

    // Eliminar mesa
    deleteTable: async (id) => {
        try {
            const response = await api.delete(`/tables/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error al eliminar mesa:', error);
            throw error;
        }
    },

    // Abrir mesa
    openTable: async (id, data) => {
        try {
            const response = await api.post(`/tables/${id}/open`, data);
            return response.data;
        } catch (error) {
            console.error('Error al abrir mesa:', error);
            throw error;
        }
    },

    // Cerrar mesa
    closeTable: async (id) => {
        try {
            const response = await api.post(`/tables/${id}/close`);
            return response.data;
        } catch (error) {
            console.error('Error al cerrar mesa:', error);
            throw error;
        }
    },

    // Asignar orden a mesa
    assignOrderToTable: async (id, orderId) => {
        try {
            const response = await api.post(`/tables/${id}/assign-order`, { orderId });
            return response.data;
        } catch (error) {
            console.error('Error al asignar orden a mesa:', error);
            throw error;
        }
    },

    // Actualizar posiciones de mesas
    updateTablePositions: async (tables) => {
        try {
            const response = await api.put('/tables/positions/bulk', { tables });
            return response.data;
        } catch (error) {
            console.error('Error al actualizar posiciones:', error);
            throw error;
        }
    },

    // Asignar mesero a mesa
    assignWaiterToTable: async (id, waiterId) => {
        try {
            const response = await api.post(`/tables/${id}/assign-waiter`, { waiterId });
            return response.data;
        } catch (error) {
            console.error('Error al asignar mesero a mesa:', error);
            throw error;
        }
    },
};

export default tablesService;
