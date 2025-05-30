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

// Layouts
import MostradorLayout from './components/layout/mostradorLayout';

function App() {
  return (
    <Router>
      <div>
        {/* Configuración del ToastContainer con las opciones especificadas */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Flip}
        />
        
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Módulo de Mostrador */}
          <Route path="/mostrador" element={<MostradorLayout />}>
            <Route index element={<Mostrador />} />
            <Route path=":orderNumber" element={<OrderDetails />} />
          </Route>
          
          {/* Módulo de Delivery */}
          <Route path="/delivery" element={<MostradorLayout />}>
            <Route index element={<Delivery />} />
            <Route path=":orderNumber" element={<DeliveryDetails />} />
          </Route>
          
          {/* Módulo de Administración */}
          <Route path="/admin">
            <Route path="productos" element={<Productos />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="caja" element={<CashRegister />} />
            <Route path="sales" element={<SalesList />} />
            <Route path="reportes" element={<Reports />} />
          </Route>
          
          {/* Redireccionamiento por defecto o página 404 */}
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;