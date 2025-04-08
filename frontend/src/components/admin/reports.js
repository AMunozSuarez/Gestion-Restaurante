import React, { useState, useEffect } from 'react';
import { getReport } from '../../api/reportsApi'; // Importa la función de la API
import '../../styles/admin/reports.css'; // Estilos específicos para la página de reportes

const Reports = () => {
    const [report, setReport] = useState(null);

    // Obtener el reporte de ventas
    const fetchReport = async () => {
        try {
            const response = await getReport({ startDate: '2025-01-01', endDate: '2025-12-31' });
            setReport(response.data);
        } catch (error) {
            console.error('Error al obtener el reporte:', error);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    return (
        <div className="reports">
            <h2>Reporte de Ventas</h2>
            {report ? (
                <div className="report-summary">
                    <p>Total Ventas: ${report.totalSales}</p>
                    <p>Total Pedidos: {report.totalOrders}</p>
                </div>
            ) : (
                <p>Cargando reporte...</p>
            )}
        </div>
    );
};

export default Reports;