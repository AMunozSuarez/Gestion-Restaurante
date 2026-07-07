import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const publicMenuService = {
  getPublicMenu: async (slug) => {
    try {
      const response = await publicApi.get(`/menu-digital/public/${slug}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener el menú');
    }
  },

  trackVisit: async (slug, payload) => {
    try {
      await publicApi.post(`/menu-digital/public/${slug}/visit`, payload);
    } catch (error) {
      // Fire-and-forget: se ignora cualquier error de analítica
    }
  },
};

export default publicMenuService;
