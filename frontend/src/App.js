import React from 'react';
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Header from './components/header';

import Login from './components/login';
import Principal from './components/principal';
import Mostrador from './components/pages/mostrador';
import Delivery from './components/delivery';
import Productos from './components/admin/productos'; 
import Categorias from './components/admin/categorias';

function App() {
  return (
    <Router>
      <div>
        <Header />
        <Routes>
          
          <Route path="/" element={<Login />} />
          <Route path="/mostrador" element={<Mostrador />} />
          <Route path="/mostrador/:orderNumber" element={<Mostrador />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/principal" element={<Principal />} />
          <Route path="/admin/productos" element={<Productos />} />
          <Route path="/admin/categorias" element={<Categorias />} />
          {/* Puedes agregar más rutas aquí para otras páginas */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;