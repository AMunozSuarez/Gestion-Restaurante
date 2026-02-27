import api from './api';

const reportService = {
    // Dashboard resumen rápido (hoy, semana, mes, tendencia)
    getDashboard: async () => {
        const response = await api.get('/report/dashboard');
        return response.data;
    },

    // Reporte de ventas con filtros de fecha
    getSalesReport: async ({ startDate, endDate } = {}) => {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await api.get('/report/sales', { params });
        return response.data;
    },

    // Reporte de productos (top, bottom, por categoría, nunca vendidos)
    getProductsReport: async ({ startDate, endDate, limit } = {}) => {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (limit) params.limit = limit;
        const response = await api.get('/report/products', { params });
        return response.data;
    },

    // Reporte de clientes (top por gasto, por frecuencia, nuevos)
    getCustomersReport: async ({ startDate, endDate, limit } = {}) => {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (limit) params.limit = limit;
        const response = await api.get('/report/customers', { params });
        return response.data;
    },
};

export default reportService;
