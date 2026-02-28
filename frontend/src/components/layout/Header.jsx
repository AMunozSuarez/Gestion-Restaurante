import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { useSubscription } from '../../hooks/useSubscription';
import logo from '../../assets/logo.png';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { 
  HomeIcon, 
  TruckIcon, 
  ArrowRightEndOnRectangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TagIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  PresentationChartBarIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

const Header = () => {
    const [showPrintInstallModal, setShowPrintInstallModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [openDropdown, setOpenDropdown] = useState(null);
  const headerRef = useRef(null);

  // Core operational nav (center)
  const navigationSections = [
    {
      name: 'Caja',
      icon: CurrencyDollarIcon,
      items: [
        { name: 'Cajas', href: '/cajas', icon: CurrencyDollarIcon },
        { name: 'Ventas', href: '/ventas', icon: ChartBarIcon },
        { name: 'Propinas', href: '/propinas', icon: CurrencyDollarIcon },
      ]
    },
    {
      name: 'Productos',
      icon: TagIcon,
      items: [
        { name: 'Productos', href: '/productos', icon: TagIcon },
        { name: 'Categorías', href: '/categorias', icon: RectangleStackIcon },
      ]
    }
  ];

  // Main nav single items (center)
  const mainNavItems = [
    { name: 'Punto de Venta', href: '/mostrador', icon: HomeIcon },
    { name: 'Mesas', href: '/mesas', icon: Squares2X2Icon },
    { name: 'Reportes', href: '/reportes', icon: PresentationChartBarIcon },
  ];

  // User/settings dropdown items (right side)
  const userMenuItems = [
    { name: 'Configuración', href: '/configuracion', icon: WrenchScrewdriverIcon },
  ];

  if (!isSubscriptionLoading && !hasActiveSubscription) {
    userMenuItems.unshift({ name: 'Suscripción', href: '/subscription/plans', icon: CreditCardIcon });
  }

  if (user?.role === 'super_admin') {
    userMenuItems.push({ name: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon });
  }

  const isActive = (href) => location.pathname === href;

  const isAnyItemActive = (items) => {
    return items.some(item => isActive(item.href));
  };

  const toggleDropdown = (sectionName) => {
    setOpenDropdown(openDropdown === sectionName ? null : sectionName);
  };

  // Check if we're in a punto de venta page
  const isPuntoDeVentaPage = () => {
    return location.pathname === '/mostrador' || location.pathname === '/delivery';
  };

  // Check if we're in mesas page
  const isMesasPage = () => {
    return location.pathname === '/mesas' || location.pathname.startsWith('/mesas/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header ref={headerRef} className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img src={logo} alt="Orden+" className="h-10 w-auto" />
            </div>
            {/* Icono de aviso para instalar el software de impresión */}
            <button
              type="button"
              className="ml-4 flex items-center text-yellow-700 hover:text-yellow-900"
              title="Instalar servicio de impresión"
              onClick={() => {
                navigate('/configuracion');
                setTimeout(() => setShowPrintInstallModal(true), 300); // Espera para asegurar navegación
              }}
            >
              <ExclamationTriangleIcon className="w-6 h-6 mr-1 animate-bounce" />
              <span className="hidden sm:inline text-sm font-semibold">Actualizacion</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* Main single nav items */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActiveItem =
                item.name === 'Punto de Venta'
                  ? isPuntoDeVentaPage() || isActive(item.href)
                  : item.name === 'Mesas'
                  ? isMesasPage() || isActive(item.href)
                  : isActive(item.href);

              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                    isActiveItem
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1.5" />
                  {item.name}
                </button>
              );
            })}

            {/* Dropdown sections: Caja, Productos */}
            {navigationSections.map((section) => {
              const SectionIcon = section.icon;
              const isDropdownOpen = openDropdown === section.name;
              const hasActiveItem = isAnyItemActive(section.items);

              return (
                <div key={section.name} className="relative">
                  <button
                    onClick={() => toggleDropdown(section.name)}
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      hasActiveItem
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <SectionIcon className="w-4 h-4 mr-1.5" />
                    {section.name}
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 ml-1 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-1">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.name}
                              onClick={() => {
                                navigate(item.href);
                                setOpenDropdown(null);
                              }}
                              className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 ${
                                isActive(item.href) ? 'text-green-600 bg-green-50' : 'text-gray-700'
                              }`}
                            >
                              <ItemIcon className="w-4 h-4 mr-3" />
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User / settings menu */}
          <div className="relative flex items-center">
            <button
              onClick={() => toggleDropdown('user')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                openDropdown === 'user'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <BuildingStorefrontIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="hidden lg:block max-w-[140px] truncate">
                {isRestaurantLoading ? 'Cargando...' : (restaurant?.name || 'Restaurante')}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 ${
                  openDropdown === 'user' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openDropdown === 'user' && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Restaurant name header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Sesión activa</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {restaurant?.name || 'Restaurante'}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  )}
                </div>

                {/* Settings & extra items */}
                <div className="py-1">
                  {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          navigate(item.href);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 ${
                          isActive(item.href) ? 'text-green-600 bg-green-50' : 'text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </button>
                    );
                  })}
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <ArrowRightEndOnRectangleIcon className="w-4 h-4 mr-3" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 py-3 space-y-1">
          {/* Main nav items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActiveItem =
              item.name === 'Punto de Venta'
                ? isPuntoDeVentaPage() || isActive(item.href)
                : item.name === 'Mesas'
                ? isMesasPage() || isActive(item.href)
                : isActive(item.href);

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActiveItem
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            );
          })}

          {/* Mobile navigation sections */}
          {navigationSections.map((section) => (
            <div key={section.name}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.name}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center px-6 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                      isActive(item.href)
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          ))}

          {/* User menu items (Configuración, Suscripción, Admin) */}
          <div className="pt-2 border-t border-gray-200">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cuenta
            </div>
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <ArrowRightEndOnRectangleIcon className="w-5 h-5 mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Punto de Venta SubHeader - Only shows when in mostrador or delivery pages */}
      {isPuntoDeVentaPage() && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-center py-2">
            <div className="flex space-x-6">
              <button
                onClick={() => navigate('/mostrador')}
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                  isActive('/mostrador')
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <HomeIcon className="w-4 h-4 mr-1.5" />
                Mostrador
              </button>
              <button
                onClick={() => navigate('/delivery')}
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                  isActive('/delivery')
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TruckIcon className="w-4 h-4 mr-1.5" />
                Delivery
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de instrucciones de instalación del software de impresión */}
      {showPrintInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Instalar Servicio de Impresión</h3>
            </div>
            <div className="p-6 space-y-4 text-gray-800">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Descargar:</strong> Haz clic en <span className="text-blue-600 font-semibold">"Descargar Servicio de Impresión"</span> en la sección de impresoras de configuración.
                </li>
                <li>
                  <strong>Ejecutar:</strong> Abre el archivo descargado (<span className="font-mono">RestaurantPrintingServiceInstaller.exe</span>).
                </li>
                <li>
                  <strong>Permiso de Windows:</strong> Si aparece una ventana de advertencia de Windows, haz clic en <span className="font-semibold">"Más información"</span> y luego en <span className="font-semibold">"Ejecutar de todas formas"</span>.
                </li>
                <li>
                  <strong>Permiso de administrador:</strong> Da permiso de administrador si se solicita.
                </li>
                <li>
                  <strong>Instalación:</strong> Haz clic en <span className="font-semibold">"Siguiente"</span> y acepta las indicaciones hasta finalizar la instalación.
                </li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">Después de instalar, vuelve a la configuración y verifica que el servicio esté conectado.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                onClick={() => setShowPrintInstallModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;