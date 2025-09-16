import React from 'react';
import '../../styles/admin/adminDashboard.css';

const AdminDashboard = ({ stats, loading, onRefresh }) => {
    if (loading) {
        return (
            <div className="admin-dashboard loading">
                <div className="loading-spinner"></div>
                <p>Cargando estadísticas...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="admin-dashboard error">
                <h3>Error al cargar estadísticas</h3>
                <button onClick={onRefresh} className="refresh-btn">
                    🔄 Reintentar
                </button>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Usuarios',
            value: stats.totalUsers,
            icon: '👥',
            color: 'blue'
        },
        {
            title: 'Total Restaurantes',
            value: stats.totalRestaurants,
            icon: '🏪',
            color: 'green'
        },
        {
            title: 'Restaurantes Activos',
            value: stats.activeRestaurants,
            icon: '✅',
            color: 'success'
        },
        {
            title: 'Restaurantes Inactivos',
            value: stats.inactiveRestaurants,
            icon: '❌',
            color: 'danger'
        },
        {
            title: 'Nuevos Usuarios (30d)',
            value: stats.recentUsers,
            icon: '🆕',
            color: 'purple'
        },
        {
            title: 'Nuevos Restaurantes (30d)',
            value: stats.recentRestaurants,
            icon: '🏢',
            color: 'orange'
        }
    ];

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h2>📊 Dashboard del Sistema</h2>
                <button onClick={onRefresh} className="refresh-btn">
                    🔄 Actualizar
                </button>
            </div>

            <div className="stats-grid">
                {statCards.map((card, index) => (
                    <div key={index} className={`stat-card ${card.color}`}>
                        <div className="stat-icon">{card.icon}</div>
                        <div className="stat-content">
                            <h3>{card.value}</h3>
                            <p>{card.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="charts-section">
                <div className="chart-container">
                    <h3>👤 Usuarios por Rol</h3>
                    <div className="role-stats">
                        {stats.usersByRole.map((role, index) => (
                            <div key={index} className="role-item">
                                <span className="role-name">
                                    {role._id === 'super_admin' && '🔧 Super Admin'}
                                    {role._id === 'owner' && '👑 Propietarios'}
                                    {role._id === 'employee' && '👤 Empleados'}
                                </span>
                                <span className="role-count">{role.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-container">
                    <h3>💼 Restaurantes por Plan</h3>
                    <div className="plan-stats">
                        {stats.restaurantsByPlan.map((plan, index) => (
                            <div key={index} className="plan-item">
                                <span className="plan-name">
                                    {plan._id === 'Basic' && '🥉 Básico'}
                                    {plan._id === 'Premium' && '🥈 Premium'}
                                    {plan._id === 'Enterprise' && '🥇 Enterprise'}
                                </span>
                                <span className="plan-count">{plan.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h3>📈 Actividad Reciente</h3>
                <div className="activity-summary">
                    <div className="activity-item">
                        <span className="activity-icon">👥</span>
                        <span>
                            {stats.recentUsers} nuevos usuarios se han registrado en los últimos 30 días
                        </span>
                    </div>
                    <div className="activity-item">
                        <span className="activity-icon">🏪</span>
                        <span>
                            {stats.recentRestaurants} nuevos restaurantes se han creado en los últimos 30 días
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
