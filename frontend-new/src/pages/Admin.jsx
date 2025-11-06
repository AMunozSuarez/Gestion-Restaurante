import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';
import { 
  CogIcon, 
  TagIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  WrenchScrewdriverIcon 
} from '@heroicons/react/24/outline';

const Admin = () => {
  const navigate = useNavigate();

  const adminActions = [
    {
      title: 'Gestión de Productos',
      description: 'Administrar el menú y precios de productos',
      icon: TagIcon,
      path: '/productos',
      color: 'text-orange-600'
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar empleados y permisos',
      icon: UserGroupIcon,
      path: '/usuarios',
      color: 'text-blue-600'
    },
    {
      title: 'Reportes',
      description: 'Ver estadísticas y reportes de ventas',
      icon: ChartBarIcon,
      path: '/ventas',
      color: 'text-green-600'
    },
    {
      title: 'Caja Registradora',
      description: 'Gestionar apertura y cierre de caja',
      icon: CurrencyDollarIcon,
      path: '/cajas',
      color: 'text-amber-600'
    },
    {
      title: 'Configuración',
      description: 'Configuración general del sistema',
      icon: WrenchScrewdriverIcon,
      path: '/configuracion',
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CogIcon className="w-8 h-8 text-brown-900" />
            <h1 className="text-2xl font-bold text-brown-900">Administración</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={index}
                  className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className={`w-8 h-8 ${action.color}`} />
                    <h3 className="text-lg font-semibold text-brown-900">
                      {action.title}
                    </h3>
                  </div>
                  <p className="text-gray-600">
                    {action.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;