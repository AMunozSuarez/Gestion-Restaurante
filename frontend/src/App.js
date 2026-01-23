import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Mostrador from './pages/Mostrador';
import Delivery from './pages/Delivery';
import TableManagement from './pages/TableManagement';
import TableDetail from './pages/TableDetail';
import CashRegister from './pages/CashRegister';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Configuracion from './pages/Configuracion';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionFailure from './pages/SubscriptionFailure';
import SubscriptionPending from './pages/SubscriptionPending';
import SubscriptionAdmin from './pages/SubscriptionAdmin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

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
          
          {/* Ruta de Super Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <SuperAdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
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
            path="/mesas"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/mesas/:tableId"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableDetail />
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
          
          <Route
            path="/ventas"
            element={
              <ProtectedRoute>
                <Layout>
                  <Ventas />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/productos"
            element={
              <ProtectedRoute>
                <Layout>
                  <Productos />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/categorias"
            element={
              <ProtectedRoute>
                <Layout>
                  <Categorias />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute>
                <Layout>
                  <Configuracion />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Rutas de suscripción */}
          <Route
            path="/subscription/plans"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionPlans />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/subscription/success"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionSuccess />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/subscription/failure"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionFailure />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/subscription/pending"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionPending />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/subscription/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubscriptionAdmin />
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
