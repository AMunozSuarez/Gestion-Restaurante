import React, { useState } from 'react';
import {
    PresentationChartBarIcon,
    BanknotesIcon,
    ShoppingBagIcon,
    UserGroupIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import ReporteDashboard from '../components/reports/ReporteDashboard';
import ReporteVentas from '../components/reports/ReporteVentas';
import ReporteProductos from '../components/reports/ReporteProductos';
import ReporteClientes from '../components/reports/ReporteClientes';
import ReporteProductoDetalle from '../components/reports/ReporteProductoDetalle';

const tabs = [
    { id: 'dashboard', label: 'Resumen', icon: PresentationChartBarIcon },
    { id: 'ventas', label: 'Ventas', icon: BanknotesIcon },
    { id: 'productos', label: 'Productos', icon: ShoppingBagIcon },
    { id: 'producto-detalle', label: 'Por Producto', icon: MagnifyingGlassIcon },
    { id: 'clientes', label: 'Clientes', icon: UserGroupIcon },
];

const Reportes = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <ReporteDashboard />;
            case 'ventas': return <ReporteVentas />;
            case 'productos': return <ReporteProductos />;
            case 'producto-detalle': return <ReporteProductoDetalle />;
            case 'clientes': return <ReporteClientes />;
            default: return <ReporteDashboard />;
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Sub-header con tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 py-3">
                            <PresentationChartBarIcon className="w-5 h-5 text-green-600" />
                            <h1 className="text-lg font-bold text-gray-800">Reportes</h1>
                        </div>
                        <nav className="flex space-x-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                                            isActive
                                                ? 'border-green-500 text-green-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 mr-1.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Reportes;
