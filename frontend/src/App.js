import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
// Importar ToastContainer y los estilos CSS
import { ToastContainer, Flip } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Páginas principales
import Mostrador from './components/pages/mostrador/mostrador';
import Delivery from './components/pages/delivery/delivery';
import Login from './components/pages/login';

// Páginas de detalles de pedidos
import OrderDetails from './components/pages/mostrador/orderDetails';
import DeliveryDetails from './components/pages/delivery/deliveryDetails';

// Componentes de administración
import Productos from './components/admin/productos'; 
import Categorias from './components/admin/categorias';
import CashRegister from './components/admin/cashRegister';
import Reports from './components/admin/reports';
import SalesList from './components/admin/salesList';

// Panel de Super Administración
import AdminPanel from './components/admin/AdminPanel';
import ProtectedAdminRoute from './components/common/ProtectedAdminRoute';

// Componentes de rutas
import ProtectedRoute from './components/common/ProtectedRoute';
import DefaultRoute from './components/common/DefaultRoute';

// Layouts
import MostradorLayout from './components/layout/mostradorLayout';

// Componente de prueba de impresión
import PrintTestComponent from './components/PrintTestComponent';

function App() {
  return (
    <Router>
      <div>
        {/* Configuración del ToastContainer con las opciones especificadas */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Flip}
        />
        
        <Header />
        <Routes>
          {/* Ruta raíz - redirige según autenticación */}
          <Route path="/" element={<DefaultRoute />} />
          
          {/* Login - solo accesible si no está autenticado */}
          <Route path="/login" element={<Login />} />
          
          {/* Módulo de Mostrador - Protegido */}
          <Route path="/mostrador" element={
            <ProtectedRoute>
              <MostradorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Mostrador />} />
            <Route path=":orderNumber" element={<OrderDetails />} />
          </Route>
          
          {/* Módulo de Delivery - Protegido */}
          <Route path="/delivery" element={
            <ProtectedRoute>
              <MostradorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Delivery />} />
            <Route path=":orderNumber" element={<DeliveryDetails />} />
          </Route>
          
          {/* Módulo de Administración - Protegido */}
          <Route path="/admin/productos" element={
            <ProtectedRoute>
              <Productos />
            </ProtectedRoute>
          } />
          <Route path="/admin/categorias" element={
            <ProtectedRoute>
              <Categorias />
            </ProtectedRoute>
          } />
          <Route path="/admin/caja" element={
            <ProtectedRoute>
              <CashRegister />
            </ProtectedRoute>
          } />
          <Route path="/admin/sales" element={
            <ProtectedRoute>
              <SalesList />
            </ProtectedRoute>
          } />
          <Route path="/admin/reportes" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Ruta de prueba de impresión */}
          <Route path="/test-print" element={
            <ProtectedRoute>
              <PrintTestComponent orderId="68a64d5c74648736adf1dc47" />
            </ProtectedRoute>
          } />

          {/* Panel de Super Administración - Doblemente protegido */}
          <Route path="/super-admin" element={
            <ProtectedRoute>
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
            </ProtectedRoute>
          } />
          
          {/* Redireccionamiento por defecto */}
          <Route path="*" element={<DefaultRoute />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;