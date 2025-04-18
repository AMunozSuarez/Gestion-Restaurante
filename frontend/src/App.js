import React from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Header from './components/header';

import Login from './components/pages/login';
import Mostrador from './components/pages/mostrador';
import Delivery from './components/pages/delivery';
import Productos from './components/admin/productos'; 
import Categorias from './components/admin/categorias';
import OrderDetails from './components/pages/orderDetails';
import MostradorLayout from './components/pages/mostradorLayout'; // Importar el layout del mostrador
import CashRegister from './components/admin/cashRegister'; // Importar el componente de caja
import Reports from './components/admin/reports';
import SalesList from './components/admin/salesList';
import DeliveryDetails from './components/pages/deliveryDetails';

function App() {
  return (
    <Router>
      <div>
        <Header />
        <Routes>
          
          <Route path="/login" element={<Login />} />
          {/* Rutas relacionadas con /mostrador */}
          <Route path="/mostrador" element={<MostradorLayout />}>
                    <Route index element={<Mostrador />} />
                    <Route path=":orderNumber" element={<OrderDetails />} />
                </Route>
          {/* Rutas relacionadas con /delivery */}

          <Route path="/delivery" index element={<Delivery />} />
          <Route path="/delivery/:orderNumber" element={<DeliveryDetails />} />
          {/* Rutas de administración */}
          <Route path="/admin/productos" element={<Productos />} />
          <Route path="/admin/categorias" element={<Categorias />} />
          <Route path="/admin/caja" element={<CashRegister />} />
          <Route path="/admin/sales" element={<SalesList />} />
          <Route path="/admin/reportes" element={<Reports />} />
          {/* Puedes agregar más rutas aquí para otras páginas */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;