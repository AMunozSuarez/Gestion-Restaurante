import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { 
  HomeIcon, 
  TruckIcon, 
  UserIcon,
  ArrowRightEndOnRectangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TagIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const [openDropdown, setOpenDropdown] = useState(null);
  const headerRef = useRef(null);

  const navigationSections = [
    {
      name: 'Caja',
      icon: CurrencyDollarIcon,
      items: [
        { name: 'Cajas', href: '/cajas', icon: CurrencyDollarIcon },
        { name: 'Ventas', href: '/ventas', icon: ChartBarIcon },
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

  const singleItems = [
    { name: 'Punto de Venta', href: '/mostrador', icon: HomeIcon },
    { name: 'Suscripción', href: '/subscription/plans', icon: CreditCardIcon },
    { name: 'Configuración', href: '/configuracion', icon: WrenchScrewdriverIcon },
  ];

  const isActive = (href) => location.pathname === href;

  const isAnyItemActive = (items) => {
    return items.some(item => isActive(item.href));
  };

  const isPuntoDeVentaActive = (href) => {
    return href === '/mostrador' && isPuntoDeVentaPage();
  };

  const toggleDropdown = (sectionName) => {
    setOpenDropdown(openDropdown === sectionName ? null : sectionName);
  };

  // Check if we're in a punto de venta page
  const isPuntoDeVentaPage = () => {
    return location.pathname === '/mostrador' || location.pathname === '/delivery';
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
              <h1 className="text-xl font-bold text-brown-900">
                {isRestaurantLoading ? 'Cargando...' : (restaurant?.name || 'Gestión Restaurante')}
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            {/* Single navigation items - Punto de Venta first */}
            {singleItems.filter(item => item.name === 'Punto de Venta').map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                    isPuntoDeVentaActive(item.href) || isActive(item.href)
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-1.5" />
                  {item.name}
                </button>
              );
            })}
            
            {/* Navigation sections with dropdowns */}
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
                    <SectionIcon className="w-5 h-5 mr-1.5" />
                    {section.name}
                    <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
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
                                isActive(item.href)
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-gray-700'
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
            
            {/* Other single navigation items */}
            {singleItems.filter(item => item.name !== 'Punto de Venta').map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-1.5" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <UserIcon className="w-5 h-5 mr-1" />
              <span>{user?.name || user?.userName || 'Usuario'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <ArrowRightEndOnRectangleIcon className="w-5 h-5 mr-1.5" />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 py-3 space-y-1">
          {/* Mobile Punto de Venta first */}
          {singleItems.filter(item => item.name === 'Punto de Venta').map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isPuntoDeVentaActive(item.href) || isActive(item.href)
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
          
          {/* Other mobile single items */}
          {singleItems.filter(item => item.name !== 'Punto de Venta').map((item) => {
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
    </header>
  );
};

export default Header;