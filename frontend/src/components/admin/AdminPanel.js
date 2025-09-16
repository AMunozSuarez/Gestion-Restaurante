import React, { useState, useEffect } from 'react';
import { getSystemStats } from '../../services/api/adminApi';
import UsersManagement from './UsersManagement';
import RestaurantsManagement from './RestaurantsManagement';
import AdminDashboard from './AdminDashboard';
import '../../styles/admin/adminPanel.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const response = await getSystemStats();
            setStats(response.stats);
        } catch (err) {
            setError('Error al cargar estadísticas del sistema');
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'users', label: 'Usuarios', icon: '👥' },
        { id: 'restaurants', label: 'Restaurantes', icon: '🏪' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AdminDashboard stats={stats} loading={loading} onRefresh={loadStats} />;
            case 'users':
                return <UsersManagement />;
            case 'restaurants':
                return <RestaurantsManagement />;
            default:
                return <AdminDashboard stats={stats} loading={loading} onRefresh={loadStats} />;
        }
    };

    if (loading && !stats) {
        return (
            <div className="admin-panel">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Cargando panel de administración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>🛠️ Panel de Administración</h1>
                <p>Gestión completa del sistema</p>
            </div>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}

            <div className="admin-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="admin-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminPanel;
