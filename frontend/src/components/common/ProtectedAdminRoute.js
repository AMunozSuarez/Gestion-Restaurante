import React from 'react';
import { Navigate } from 'react-router-dom';
import useAdminAuth from '../../hooks/useAdminAuth';

const ProtectedAdminRoute = ({ children }) => {
    const { isAdmin, loading, userRole } = useAdminAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <p style={{ fontSize: '1.2rem', margin: 0 }}>
                    Verificando permisos de administrador...
                </p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!isAdmin) {
        // Si no es admin, mostrar página de acceso denegado
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                textAlign: 'center',
                padding: '20px'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚫</div>
                <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>
                    Acceso Denegado
                </h1>
                <p style={{ fontSize: '1.2rem', margin: '0 0 30px 0', opacity: 0.9 }}>
                    No tienes permisos para acceder al panel de administración
                </p>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '30px'
                }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>
                        <strong>Tu rol actual:</strong> {
                            userRole === 'owner' ? '👑 Propietario' : 
                            userRole === 'employee' ? '👤 Empleado' : 
                            userRole || 'No identificado'
                        }
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                        Se requiere rol de <strong>🔧 Super Administrador</strong>
                    </p>
                </div>
                <button
                    onClick={() => window.location.href = '/mostrador'}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    🏠 Ir al Panel Principal
                </button>
            </div>
        );
    }

    return children;
};

export default ProtectedAdminRoute;
