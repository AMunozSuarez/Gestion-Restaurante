import api from './api';

export const tagsService = {
  // Obtener todas las etiquetas
  getTags: async () => {
    try {
      const response = await api.get('/tag/getAll');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener etiquetas');
    }
  },

  // Crear nueva etiqueta
  createTag: async (tagData) => {
    try {
      const response = await api.post('/tag/create', tagData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al crear etiqueta');
    }
  },

  // Actualizar etiqueta
  updateTag: async (id, tagData) => {
    try {
      const response = await api.put(`/tag/update/${id}`, tagData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar etiqueta');
    }
  },

  // Eliminar etiqueta
  deleteTag: async (id) => {
    try {
      const response = await api.delete(`/tag/delete/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al eliminar etiqueta');
    }
  },
};

export default tagsService;
