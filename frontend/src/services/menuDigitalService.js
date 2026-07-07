import api from './api';

export const menuDigitalService = {
  getSettings: async () => {
    try {
      const response = await api.get('/menu-digital/settings');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener la configuración del menú digital');
    }
  },

  updateSettings: async (digitalMenu) => {
    try {
      const response = await api.put('/menu-digital/settings', { digitalMenu });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al actualizar la configuración del menú digital');
    }
  },

  uploadLogo: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/menu-digital/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al subir el logo');
    }
  },

  uploadBanner: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/menu-digital/upload/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al subir el banner');
    }
  },

  getQrPngUrl: async () => {
    try {
      const response = await api.get('/menu-digital/qr');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al generar el código QR');
    }
  },

  getQrSvg: async () => {
    try {
      const response = await api.get('/menu-digital/qr', {
        params: { format: 'svg' },
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al generar el código QR en SVG');
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/menu-digital/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener las estadísticas del menú digital');
    }
  },
};

export default menuDigitalService;
