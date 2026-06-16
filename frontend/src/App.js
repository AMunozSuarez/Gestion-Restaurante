import React, { useEffect } from 'react';
import printingService from './services/printingService';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CashRegisterProvider } from './store/CashRegisterContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Mostrador from './pages/Mostrador';
import Delivery from './pages/Delivery';
import TableManagement from './pages/TableManagement';
import TableDetail from './pages/TableDetail';
import CashRegister from './pages/CashRegister';
import Ventas from './pages/Ventas';
import Propinas from './pages/Propinas';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Extras from './pages/Extras';
import Configuracion from './pages/Configuracion';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionFailure from './pages/SubscriptionFailure';
import SubscriptionPending from './pages/SubscriptionPending';
import SubscriptionAdmin from './pages/SubscriptionAdmin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Reportes from './pages/Reportes';
import Inventario from './pages/Inventario';

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
  useEffect(() => {
    const onKeyDown = async (e) => {
      try {
        const active = document.activeElement;
        const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || active?.isContentEditable) return;
        const hotkey = (printingService.getDrawerHotkey() || '').toLowerCase();
        if (!hotkey) return;

        // Normalizar e.key para que coincida con el formato guardado en Configuracion.jsx
        const currentKeyName = e.key === ' ' ? 'Space' : e.key;

        const matched = currentKeyName && currentKeyName.toLowerCase() === hotkey;
        const allowed = printingService.isCurrentUserOwner() || printingService.getDrawerAlwaysOpen();

        if (matched) {
          if (!allowed) return;
          const printer = printingService.getDrawerPrinter() || localStorage.getItem('drawerPrinter') || null;
          await printingService.openDrawer(printer);
        }
      } catch (err) {
        console.error('Error handling global drawer hotkey:', err);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <AuthProvider>
      <CashRegisterProvider>
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
            path="/propinas"
            element={
              <ProtectedRoute>
                <Layout>
                  <Propinas />
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
            path="/extras"
            element={
              <ProtectedRoute>
                <Layout>
                  <Extras />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventario"
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventario />
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
          
          <Route
            path="/reportes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reportes />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Rutas de suscripción - Success/Failure/Pending sin protección para permitir retorno desde MercadoPago */}
          <Route
            path="/subscription/success"
            element={<SubscriptionSuccess />}
          />
          
          <Route
            path="/subscription/failure"
            element={<SubscriptionFailure />}
          />
          
          <Route
            path="/subscription/pending"
            element={<SubscriptionPending />}
          />
          
          {/* Ruta de planes protegida */}
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
      </CashRegisterProvider>
    </AuthProvider>
  );
}

export default App;
