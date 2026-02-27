import { useState, useCallback } from 'react';
import reportService from '../services/reportService';

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export const useReportDashboard = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await reportService.getDashboard();
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar dashboard');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, error, fetch };
};

// ─── Ventas ────────────────────────────────────────────────────────────────────

export const useReportSales = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async (filters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await reportService.getSalesReport(filters);
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar reporte de ventas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, error, fetch };
};

// ─── Productos ─────────────────────────────────────────────────────────────────

export const useReportProducts = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async (filters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await reportService.getProductsReport(filters);
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar reporte de productos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, error, fetch };
};

// ─── Clientes ──────────────────────────────────────────────────────────────────

export const useReportCustomers = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async (filters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await reportService.getCustomersReport(filters);
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar reporte de clientes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { data, isLoading, error, fetch };
};
