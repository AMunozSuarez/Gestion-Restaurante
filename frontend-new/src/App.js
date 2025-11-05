import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Mostrador from './pages/Mostrador';
import Delivery from './pages/Delivery';
import Admin from './pages/Admin';
import CashRegister from './pages/CashRegister';

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-brown-600">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ruta de login sin layout */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas con layout */}
          <Route
            path="/mostrador"
            element={
              <ProtectedRoute>
                <Layout>
                  <Mostrador />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/delivery"
            element={
              <ProtectedRoute>
                <Layout>
                  <Delivery />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cajas"
            element={
              <ProtectedRoute>
                <Layout>
                  <CashRegister />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/mostrador" replace />} />
          
          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/mostrador" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
