import React from 'react';
import { Card } from '../components/ui';
import { CogIcon } from '@heroicons/react/24/outline';

const Admin = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CogIcon className="w-8 h-8" />
        <h1 className="text-2xl font-bold text-brown-900">Administración</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold text-brown-900 mb-2">
            Gestión de Productos
          </h3>
          <p className="text-gray-600">
            Administrar el menú y precios de productos
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold text-brown-900 mb-2">
            Gestión de Usuarios
          </h3>
          <p className="text-gray-600">
            Administrar empleados y permisos
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold text-brown-900 mb-2">
            Reportes
          </h3>
          <p className="text-gray-600">
            Ver estadísticas y reportes de ventas
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold text-brown-900 mb-2">
            Caja Registradora
          </h3>
          <p className="text-gray-600">
            Gestionar apertura y cierre de caja
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold text-brown-900 mb-2">
            Configuración
          </h3>
          <p className="text-gray-600">
            Configuración general del sistema
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Admin;