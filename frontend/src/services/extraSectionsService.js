import api from './api';

const extraSectionsService = {
    getAll: async () => {
        try {
            const response = await api.get('/extra-sections/getAll');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al obtener secciones de extras');
        }
    },

    getById: async (id) => {
        try {
            const response = await api.get(`/extra-sections/get/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al obtener la sección');
        }
    },

    create: async (data) => {
        try {
            const response = await api.post('/extra-sections/create', data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al crear la sección de extras');
        }
    },

    update: async (id, data) => {
        try {
            const response = await api.put(`/extra-sections/update/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al actualizar la sección de extras');
        }
    },

    delete: async (id) => {
        try {
            const response = await api.delete(`/extra-sections/delete/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al eliminar la sección de extras');
        }
    }
};

export default extraSectionsService;
