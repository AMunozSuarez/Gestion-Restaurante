import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { useSubscription } from '../../hooks/useSubscription';
import { useInventoryAlert } from '../../hooks/useInventoryAlert';
import logo from '../../assets/logo.png';
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
  QuestionMarkCircleIcon,
  PuzzlePieceIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const {
    subscription,
    hasActiveSubscription,
    daysRemaining: subscriptionDaysRemaining,
    isLoading: isSubscriptionLoading,
  } = useSubscription();
  const isMesero = user?.role === 'mesero';
  const inventoryEnabled = Boolean(restaurant?.settings?.inventory?.enabled) && !isMesero;
  const { lowStockCount } = useInventoryAlert(inventoryEnabled);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubscriptionNoticeOpen, setIsSubscriptionNoticeOpen] = useState(false);
  const [isInventoryAlertOpen, setIsInventoryAlertOpen] = useState(false);
  const headerRef = useRef(null);
  const subscriptionNoticeRef = useRef(null);
  const subscriptionNoticeCloseTimerRef = useRef(null);
  const inventoryAlertRef = useRef(null);
  const inventoryAlertCloseTimerRef = useRef(null);

  // Core operational nav (center) — el rol mesero solo tiene acceso al módulo de Mesas
  const navigationSections = isMesero ? [] : [
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
        { name: 'Extras', href: '/extras', icon: PuzzlePieceIcon },
        { name: 'Inventario', href: '/inventario', icon: ArchiveBoxIcon },
      ]
    }
  ];

  // Main nav single items (center)
  const mainNavItems = isMesero
    ? [{ name: 'Mesas', href: '/mesas', icon: Squares2X2Icon }]
    : [
      { name: 'Punto de Venta', href: '/mostrador', icon: HomeIcon },
      { name: 'Mesas', href: '/mesas', icon: Squares2X2Icon },
      { name: 'Reportes', href: '/reportes', icon: PresentationChartBarIcon },
    ];

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'super_admin';

  // User/settings dropdown items (right side)
  const userMenuItems = isMesero ? [] : [
    { name: 'Configuración', href: '/configuracion', icon: WrenchScrewdriverIcon },
  ];

  if (isOwnerOrAdmin) {
    userMenuItems.push({ name: 'Menú Digital', href: '/menu-digital', icon: DevicePhoneMobileIcon });
  }

  if (!isMesero && !isSubscriptionLoading && !hasActiveSubscription) {
    userMenuItems.unshift({ name: 'Suscripción', href: '/subscription/plans', icon: CreditCardIcon });
  }

  if (user?.role === 'super_admin') {
    userMenuItems.push({ name: 'Admin Dashboard', href: '/admin', icon: ShieldCheckIcon });
  }

  const fallbackDaysRemaining = subscription?.endDate
    ? Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const normalizedDaysRemaining = typeof subscriptionDaysRemaining === 'number'
    ? Math.max(0, subscriptionDaysRemaining)
    : (typeof fallbackDaysRemaining === 'number' ? Math.max(0, fallbackDaysRemaining) : null);

  const hasSubscriptionPaymentIssue = !hasActiveSubscription;
  const hasPendingPayment = subscription?.status === 'pending';
  const shouldShowSubscriptionNotice = !isMesero && !isSubscriptionLoading && (
    hasSubscriptionPaymentIssue ||
    (normalizedDaysRemaining !== null && normalizedDaysRemaining <= 7)
  );
  const isCriticalSubscriptionNotice = hasSubscriptionPaymentIssue || (
    normalizedDaysRemaining !== null && normalizedDaysRemaining <= 3
  );

  const subscriptionNoticeTitle = hasSubscriptionPaymentIssue
    ? (hasPendingPayment ? 'Pago de suscripción pendiente' : 'Suscripción vencida')
    : normalizedDaysRemaining === 0
      ? 'Tu suscripción vence hoy'
      : normalizedDaysRemaining === 1
        ? 'Tu suscripción vence mañana'
        : `Tu suscripción vence en ${normalizedDaysRemaining} días`;

  const subscriptionNoticeDescription = hasSubscriptionPaymentIssue
    ? 'Debes pagar o renovar tu suscripción para seguir usando el servicio.'
    : normalizedDaysRemaining <= 1
      ? 'Renueva ahora para no perder el acceso al sistema.'
      : normalizedDaysRemaining <= 3
        ? 'Renueva pronto para evitar interrupciones del servicio.'
        : 'Renueva a tiempo para no perder el acceso al sistema.';

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

      if (subscriptionNoticeRef.current && !subscriptionNoticeRef.current.contains(event.target)) {
        setIsSubscriptionNoticeOpen(false);
      }

      if (inventoryAlertRef.current && !inventoryAlertRef.current.contains(event.target)) {
        setIsInventoryAlertOpen(false);
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

  const handleGoToSubscriptionSettings = () => {
    if (subscriptionNoticeCloseTimerRef.current) {
      clearTimeout(subscriptionNoticeCloseTimerRef.current);
      subscriptionNoticeCloseTimerRef.current = null;
    }
    setIsSubscriptionNoticeOpen(false);
    setOpenDropdown(null);
    setIsMobileMenuOpen(false);
    navigate('/configuracion?tab=subscription');
  };

  const handleSubscriptionNoticeMouseEnter = () => {
    if (subscriptionNoticeCloseTimerRef.current) {
      clearTimeout(subscriptionNoticeCloseTimerRef.current);
      subscriptionNoticeCloseTimerRef.current = null;
    }
    setIsSubscriptionNoticeOpen(true);
  };

  const handleSubscriptionNoticeMouseLeave = () => {
    if (subscriptionNoticeCloseTimerRef.current) {
      clearTimeout(subscriptionNoticeCloseTimerRef.current);
    }

    subscriptionNoticeCloseTimerRef.current = setTimeout(() => {
      setIsSubscriptionNoticeOpen(false);
      subscriptionNoticeCloseTimerRef.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (subscriptionNoticeCloseTimerRef.current) {
        clearTimeout(subscriptionNoticeCloseTimerRef.current);
      }
      if (inventoryAlertCloseTimerRef.current) {
        clearTimeout(inventoryAlertCloseTimerRef.current);
      }
    };
  }, []);

  return (
    <header ref={headerRef} className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="Menú"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="flex-shrink-0">
              <img src={logo} alt="Orden+" className="h-10 w-auto" />
            </div>
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
            {inventoryEnabled && lowStockCount > 0 && (
              <div
                ref={inventoryAlertRef}
                className="relative mr-2"
                onMouseEnter={() => {
                  if (inventoryAlertCloseTimerRef.current) {
                    clearTimeout(inventoryAlertCloseTimerRef.current);
                    inventoryAlertCloseTimerRef.current = null;
                  }
                  setIsInventoryAlertOpen(true);
                }}
                onMouseLeave={() => {
                  if (inventoryAlertCloseTimerRef.current) clearTimeout(inventoryAlertCloseTimerRef.current);
                  inventoryAlertCloseTimerRef.current = setTimeout(() => {
                    setIsInventoryAlertOpen(false);
                    inventoryAlertCloseTimerRef.current = null;
                  }, 180);
                }}
              >
                <button
                  onClick={() => setIsInventoryAlertOpen((prev) => !prev)}
                  className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors duration-200"
                  aria-label="Alerta de stock bajo"
                >
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                    {lowStockCount > 9 ? '9+' : lowStockCount}
                  </span>
                </button>

                {isInventoryAlertOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-amber-200 rounded-lg shadow-lg z-50 p-3">
                    <div className="flex items-start gap-2 mb-2 pb-2 border-b border-amber-100">
                      <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                      <p className="text-sm font-semibold text-amber-700">
                        {lowStockCount === 1
                          ? '1 insumo con stock bajo'
                          : `${lowStockCount} insumos con stock bajo`}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">
                      Hay insumos que están por debajo del stock mínimo. Revisa el inventario para evitar interrupciones en la operación.
                    </p>
                    <button
                      onClick={() => {
                        setIsInventoryAlertOpen(false);
                        navigate('/inventario');
                      }}
                      className="mt-3 w-full px-3 py-2 rounded-md text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors duration-200"
                    >
                      Ir a Inventario
                    </button>
                  </div>
                )}
              </div>
            )}

            {shouldShowSubscriptionNotice && (
              <div
                ref={subscriptionNoticeRef}
                className="relative mr-2"
                onMouseEnter={handleSubscriptionNoticeMouseEnter}
                onMouseLeave={handleSubscriptionNoticeMouseLeave}
              >
                <button
                  onClick={() => setIsSubscriptionNoticeOpen((prev) => !prev)}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors duration-200 ${
                    isCriticalSubscriptionNotice
                      ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                      : 'text-amber-500 border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                  aria-label="Alerta de suscripción"
                >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
                </button>

                <div
                  className={`absolute top-full right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg z-50 p-3 ${
                    isSubscriptionNoticeOpen ? 'block' : 'hidden'
                  } ${isCriticalSubscriptionNotice ? 'border-red-200' : 'border-amber-200'}`}
                >
                  <div className={`flex items-start gap-2 mb-2 pb-2 border-b ${isCriticalSubscriptionNotice ? 'border-red-100' : 'border-amber-100'}`}>
                    <QuestionMarkCircleIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCriticalSubscriptionNotice ? 'text-red-500' : 'text-amber-500'}`} />
                    <p className={`text-sm font-semibold ${isCriticalSubscriptionNotice ? 'text-red-700' : 'text-amber-700'}`}>
                      {subscriptionNoticeTitle}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {subscriptionNoticeDescription}
                  </p>
                  <button
                    onClick={handleGoToSubscriptionSettings}
                    className={`mt-3 w-full px-3 py-2 rounded-md text-sm font-medium text-white transition-colors duration-200 ${
                      isCriticalSubscriptionNotice
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                  >
                    Ir a Suscripción
                  </button>
                </div>
              </div>
            )}

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
      {isMobileMenuOpen && (
      <>
      <div className="md:hidden fixed inset-0 top-[64px] bg-white z-40 overflow-y-auto">
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
                onClick={() => { navigate(item.href); setIsMobileMenuOpen(false); }}
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
                    onClick={() => { navigate(item.href); setIsMobileMenuOpen(false); }}
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

          {/* Alerta de stock bajo en mobile */}
          {inventoryEnabled && lowStockCount > 0 && (
            <div className="mx-3 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-700">
                  {lowStockCount === 1 ? '1 insumo con stock bajo' : `${lowStockCount} insumos con stock bajo`}
                </p>
              </div>
              <button
                onClick={() => { navigate('/inventario'); setIsMobileMenuOpen(false); }}
                className="mt-1 w-full px-3 py-1.5 rounded-md text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors duration-200"
              >
                Ir a Inventario
              </button>
            </div>
          )}

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
                  onClick={() => { navigate(item.href); setIsMobileMenuOpen(false); }}
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
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
            >
              <ArrowRightEndOnRectangleIcon className="w-5 h-5 mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Punto de Venta SubHeader - Only shows when in mostrador or delivery pages */}
      {isPuntoDeVentaPage() && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-center py-1 overflow-x-auto">
            <div className="flex space-x-2 md:space-x-6 px-4 min-w-max">
              <button
                onClick={() => navigate('/mostrador')}
                className={`inline-flex items-center px-3 py-2.5 border-b-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2.5 border-b-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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