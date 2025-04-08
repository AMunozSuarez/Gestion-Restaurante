import React from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Header from './components/header';

import Login from './components/pages/login';
import Mostrador from './components/pages/mostrador';
import Delivery from './components/delivery';
import Productos from './components/admin/productos'; 
import Categorias from './components/admin/categorias';
import OrderDetails from './components/pages/orderDetails';
import MostradorLayout from './components/pages/mostradorLayout'; // Importar el layout del mostrador
import CashRegister from './components/admin/cashRegister'; // Importar el componente de caja
import Reports from './components/admin/reports';

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
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/admin/productos" element={<Productos />} />
          <Route path="/admin/categorias" element={<Categorias />} />
          <Route path="/admin/caja" element={<CashRegister />} />
          <Route path="/admin/reportes" element={<Reports />} />
          {/* Puedes agregar más rutas aquí para otras páginas */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;