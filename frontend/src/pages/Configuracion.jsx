import React, { useState, useEffect } from 'react';
import {
  PrinterIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CalendarIcon,
  XCircleIcon,
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import printingService from '../services/printingService';
import printerConfigService from '../services/printerConfigService';
import { categoriesService } from '../services/categoriesService';
import productsService from '../services/productsService';
import * as subscriptionService from '../services/subscriptionService';
import usersService from '../services/usersService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Configuracion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getValidTab = (tabValue) => {
    if (tabValue === 'printers' || tabValue === 'subscription' || tabValue === 'users') {
      return tabValue;
    }
    return null;
  };

  const getTabFromSearch = (search) => {
    const searchParams = new URLSearchParams(search);
    return getValidTab(searchParams.get('tab'));
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromSearch(location.search) || 'printers'); // 'printers', 'subscription' o 'users'

  // Verificar si el usuario es propietario o super admin
  const isOwnerOrAdmin = user && (user.role === 'owner' || user.role === 'super_admin');
  const isOwner = user && user.role === 'owner';

  // Estados para impresoras
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [serviceStatus, setServiceStatus] = useState('checking'); // checking, online, offline
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fontSettings, setFontSettings] = useState(() => printingService.getLocalFontSettings());
  const [savingFont, setSavingFont] = useState(false);
  const [testingFont, setTestingFont] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);
  const [updatePrintMode, setUpdatePrintMode] = useState(() => printingService.getUpdatePrintMode());
  const [reprintTicketOnCloseTable, setReprintTicketOnCloseTable] = useState(() => printingService.getReprintTicketOnCloseTable());
  const [printOnDeletedItemsUpdate, setPrintOnDeletedItemsUpdate] = useState(() => printingService.getPrintOnDeletedItemsUpdate());
  const [onlyOwnerCanCloseTable, setOnlyOwnerCanCloseTable] = useState(() => printingService.getOnlyOwnerCanCloseTable());
  const [onlyOwnerCanDeleteOrderItems, setOnlyOwnerCanDeleteOrderItems] = useState(() => printingService.getOnlyOwnerCanDeleteOrderItems());
  const [avoidDuplicateKitchenUpdatePrint, setAvoidDuplicateKitchenUpdatePrint] = useState(() => printingService.getAvoidDuplicateKitchenUpdatePrint());
  const [drawerPrinter, setDrawerPrinter] = useState(() => localStorage.getItem('drawerPrinter') || '');
  const [drawerAlwaysOpen, setDrawerAlwaysOpen] = useState(() => printingService.getDrawerAlwaysOpen());
  const [drawerOpenOnCloseOrder, setDrawerOpenOnCloseOrder] = useState(() => printingService.getDrawerOpenOnCloseOrder());
  const [drawerHotkey, setDrawerHotkey] = useState(() => printingService.getDrawerHotkey() || '');
  const [capturingHotkey, setCapturingHotkey] = useState(false);
  const [allPrinters, setAllPrinters] = useState([]);

  // Estados para multi-impresora
  const [printerRoles, setPrinterRoles] = useState(() => printerConfigService.getPrinterRoles());
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryPrintMap, setCategoryPrintMap] = useState({}); // { catId: ["cocina", "barra"] }
  const [savingPrintDestinations, setSavingPrintDestinations] = useState(false);
  const [detectedExtraSections, setDetectedExtraSections] = useState([]);
  const [extraSectionProductMap, setExtraSectionProductMap] = useState({});
  const [loadingExtraSections, setLoadingExtraSections] = useState(false);
  const [extraSectionPrintMap, setExtraSectionPrintMap] = useState(() => printingService.getExtraSectionPrintDestinations()); // { sectionName: ["cocina", "barra"] }
  const [savingExtraSectionDestinations, setSavingExtraSectionDestinations] = useState(false);

  // Estados para suscripción
  const [subscription, setSubscription] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null); // Para isInGracePeriod y otros datos
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [renewingSubscription, setRenewingSubscription] = useState(false);

  // Estados para usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    userName: '',
    email: '',
    password: '',
    phone: ''
  });

  // Redirigir empleados si intentan acceder a pestañas restringidas
  useEffect(() => {
    if (!isOwnerOrAdmin && (activeTab === 'subscription' || activeTab === 'users')) {
      setActiveTab('printers');
    }
  }, [activeTab, isOwnerOrAdmin]);

  // Permite abrir una pestaña específica con /configuracion?tab=subscription
  useEffect(() => {
    const requestedTab = getTabFromSearch(location.search) || getValidTab(location.state?.tab);

    if (!requestedTab) {
      return;
    }

    if (!isOwnerOrAdmin && (requestedTab === 'subscription' || requestedTab === 'users')) {
      setActiveTab('printers');
      return;
    }

    setActiveTab((prev) => (prev === requestedTab ? prev : requestedTab));
  }, [location.search, location.state, isOwnerOrAdmin]);

  // Cargar estado inicial
  useEffect(() => {
    if (activeTab === 'printers') {
      checkServiceAndLoadPrinters();
      loadSavedPrinters();
      loadFontSettings();
      loadCategoriesForPrinting();
      loadExtraSectionsForPrinting();
      loadRestaurantPrintSettings();
    } else if (activeTab === 'subscription' && isOwnerOrAdmin) {
      loadSubscription();
    } else if (activeTab === 'users' && isOwnerOrAdmin) {
      loadUsers();
    }
  }, [activeTab, isOwnerOrAdmin]);

  const loadRestaurantPrintSettings = async () => {
    const syncResult = await printingService.syncRestaurantSettingsFromBackend();

    setUpdatePrintMode(printingService.getUpdatePrintMode());
    setReprintTicketOnCloseTable(printingService.getReprintTicketOnCloseTable());
    setPrintOnDeletedItemsUpdate(printingService.getPrintOnDeletedItemsUpdate());
    setOnlyOwnerCanCloseTable(printingService.getOnlyOwnerCanCloseTable());
    setOnlyOwnerCanDeleteOrderItems(printingService.getOnlyOwnerCanDeleteOrderItems());
    setAvoidDuplicateKitchenUpdatePrint(printingService.getAvoidDuplicateKitchenUpdatePrint());
    setExtraSectionPrintMap(printingService.getExtraSectionPrintDestinations());
    setDrawerOpenOnCloseOrder(printingService.getDrawerOpenOnCloseOrder());

    if (!syncResult.success) {
      setMessage({
        type: 'error',
        text: 'No se pudo sincronizar la configuración compartida. Se muestran valores locales.',
      });
    }
  };

  const rollbackRestaurantSettingsFromBackend = async () => {
    await printingService.syncRestaurantSettingsFromBackend(true);
    setUpdatePrintMode(printingService.getUpdatePrintMode());
    setReprintTicketOnCloseTable(printingService.getReprintTicketOnCloseTable());
    setPrintOnDeletedItemsUpdate(printingService.getPrintOnDeletedItemsUpdate());
    setOnlyOwnerCanCloseTable(printingService.getOnlyOwnerCanCloseTable());
    setOnlyOwnerCanDeleteOrderItems(printingService.getOnlyOwnerCanDeleteOrderItems());
    setAvoidDuplicateKitchenUpdatePrint(printingService.getAvoidDuplicateKitchenUpdatePrint());
    setExtraSectionPrintMap(printingService.getExtraSectionPrintDestinations());
    setDrawerOpenOnCloseOrder(printingService.getDrawerOpenOnCloseOrder());
  };

  // Verificar servicio y cargar impresoras
  const checkServiceAndLoadPrinters = async () => {
    setLoading(true);
    setServiceStatus('checking');

    try {
      // Verificar estado del servicio
      const healthResponse = await printingService.checkHealth();

      if (healthResponse.success) {
        setServiceStatus('online');
        // Cargar impresoras
        const printersResponse = await printingService.getPrinters();

        if (printersResponse.success) {
          setPrinters(printersResponse.data || []);
        } else {
          setMessage({
            type: 'error',
            text: 'Error al cargar impresoras: ' + printersResponse.error
          });
        }
      } else {
        setServiceStatus('offline');
        setMessage({
          type: 'error',
          text: 'Servicio de impresión no disponible. Contacte al administrador del sistema.'
        });
      }
    } catch (error) {
      setServiceStatus('offline');
      setMessage({
        type: 'error',
        text: 'No se puede conectar al servicio de impresión. Contacte al administrador.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar impresoras guardadas
  const loadSavedPrinters = () => {
    const saved = localStorage.getItem('selectedPrinter');
    const defaultSaved = printingService.getDefaultPrinter();

    if (saved) {
      setSelectedPrinter(saved);
    }
    if (defaultSaved) {
      setDefaultPrinter(defaultSaved);
    }
  };

  // Cargar configuración de fuente
  // Sincroniza las settings locales al servicio C# (p.ej. tras reinicio del servicio)
  const loadFontSettings = async () => {
    const localSettings = printingService.getLocalFontSettings();
    await printingService.saveSettings(localSettings);
  };

  // Guardar configuración de fuente
  const handleSaveFontSettings = async (newSettings) => {
    const nextSettings = {
      ...fontSettings,
      ...newSettings,
    };

    setSavingFont(true);
    setFontSettings(nextSettings);
    const result = await printingService.saveSettings(nextSettings);
    setSavingFont(false);

    if (result.success) {
      setFontSettings(printingService.getLocalFontSettings());
      setMessage({ type: 'success', text: 'Configuración de fuente guardada. Se aplicará al siguiente ticket impreso.' });
    } else {
      setMessage({ type: 'error', text: 'Error al guardar configuración de fuente. Verifique que el servicio esté activo.' });
    }
  };

  // Imprimir prueba de fuente
  const handleFontTestPrint = async () => {
    if (!defaultPrinter) {
      setMessage({ type: 'error', text: 'Establece una impresora predeterminada primero para probar la fuente.' });
      return;
    }
    setTestingFont(true);
    setMessage({ type: 'info', text: `Enviando prueba de fuente a ${defaultPrinter}...` });
    try {
      const result = await printingService.printFontTest(defaultPrinter);
      if (result.success) {
        setMessage({ type: 'success', text: 'Prueba de fuente enviada correctamente.' });
      } else {
        setMessage({ type: 'error', text: 'Error al imprimir prueba: ' + result.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al imprimir prueba de fuente.' });
    } finally {
      setTestingFont(false);
    }
  };

  // Cargar lista de impresoras al montar el componente
  useEffect(() => {
    const loadPrinters = async () => {
      try {
        const result = await printingService.getPrinters();
        if (result.success && result.data) {
          setAllPrinters(result.data);
        }
      } catch (e) {
        console.error('Error cargando impresoras:', e);
      }
    };
    loadPrinters();
  }, []);

  useEffect(() => {
    if (!capturingHotkey) return;

    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta'];
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setCapturingHotkey(false);
        setMessage({ type: 'info', text: 'Asignación cancelada' });
        return;
      }

      if (!e.key || modifierKeys.includes(e.key)) {
        return;
      }

      const keyName = e.key === ' ' ? 'Space' : e.key;
      setDrawerHotkey(keyName);
      printingService.setDrawerHotkey(keyName);
      printingService.saveRestaurantSettingsToBackend({ drawerHotkey: keyName }).catch(() => {});
      setCapturingHotkey(false);
      setMessage({ type: 'success', text: `Tecla asignada: ${keyName.toUpperCase()}` });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [capturingHotkey]);

  // Cambiar impresora seleccionada para caja
  const handleDrawerPrinterChange = (printerName) => {
    setDrawerPrinter(printerName);
    localStorage.setItem('drawerPrinter', printerName);
    printingService.setDrawerPrinter(printerName);
    // Persistir configuración al backend
    printingService.saveRestaurantSettingsToBackend({ drawerPrinter: printerName }).catch(() => {});
    setMessage({ type: 'success', text: `Impresora de caja configurada: ${printerName}` });
  };

  // Probar caja electrónica con la impresora seleccionada
  const handleTestDrawer = async () => {
    setTestingDrawer(true);
    setMessage({ type: 'info', text: 'Abriendo caja en: ' + drawerPrinter });
    try {
      console.log(`🔧 Probando caja en: ${drawerPrinter}`);
      const result = await printingService.openDrawer(drawerPrinter);
      
      if (result.success) {
        setMessage({ type: 'success', text: '✓ Caja abierta en: ' + drawerPrinter });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Error: La caja no se abrió en ' + drawerPrinter + '. Verifica que sea la impresora correcta.' 
        });
      }
    } catch (e) {
      console.error('🔧 Error:', e);
      setMessage({ type: 'error', text: 'Error: ' + (e.message || 'Error desconocido') });
    } finally {
      setTestingDrawer(false);
    }
  };

  const handleToggleDrawerAlwaysOpen = async (enabled) => {
    setDrawerAlwaysOpen(enabled);
    printingService.setDrawerAlwaysOpen(enabled);
    // Persistir al backend
    await printingService.saveRestaurantSettingsToBackend({ drawerAlwaysOpen: enabled });
  };
  const handleToggleDrawerOpenOnCloseOrder = async (enabled) => {
    setDrawerOpenOnCloseOrder(enabled);
    printingService.setDrawerOpenOnCloseOrder(enabled);
    await printingService.saveRestaurantSettingsToBackend({ drawerOpenOnCloseOrder: enabled });
  };

  // Cambiar modo de impresión de actualizaciones
  const handleUpdatePrintModeChange = async (mode) => {
    setUpdatePrintMode(mode);
    printingService.setUpdatePrintMode(mode);
    const result = await printingService.saveRestaurantSettingsToBackend({ updatePrintMode: mode });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({ 
      type: 'success', 
      text: mode === 'new-only' 
        ? 'Al actualizar comandas, se imprimirán solo los productos nuevos' 
        : 'Al actualizar comandas, se imprimirá toda la comanda con productos nuevos marcados con *'
    });
  };

  // Activar o desactivar reimpresion de ticket al cerrar mesa
  const handleReprintTicketOnCloseTableChange = async (enabled) => {
    setReprintTicketOnCloseTable(enabled);
    printingService.setReprintTicketOnCloseTable(enabled);
    const result = await printingService.saveRestaurantSettingsToBackend({ reprintTicketOnCloseTable: enabled });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({
      type: 'success',
      text: enabled
        ? 'Al cerrar mesa se reimprimirá el ticket de cliente automáticamente'
        : 'Reimpresión automática de ticket al cerrar mesa desactivada'
    });
  };

  // Activar o desactivar impresion de actualizacion cuando hay productos eliminados
  const handlePrintOnDeletedItemsUpdateChange = async (enabled) => {
    setPrintOnDeletedItemsUpdate(enabled);
    printingService.setPrintOnDeletedItemsUpdate(enabled);
    const result = await printingService.saveRestaurantSettingsToBackend({ printOnDeletedItemsUpdate: enabled });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({
      type: 'success',
      text: enabled
        ? 'Se imprimirá actualización de cocina cuando se eliminen productos'
        : 'No se imprimirá actualización cuando solo se eliminen productos'
    });
  };

  // Activar o desactivar cierre de mesa solo para owner
  const handleOnlyOwnerCanCloseTableChange = async (enabled) => {
    setOnlyOwnerCanCloseTable(enabled);
    printingService.setOnlyOwnerCanCloseTable(enabled);
    const result = await printingService.saveRestaurantSettingsToBackend({ onlyOwnerCanCloseTable: enabled });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({
      type: 'success',
      text: enabled
        ? 'Solo el dueño podrá cerrar mesas en todo el restaurante'
        : 'Cualquier usuario con acceso podrá cerrar mesas'
    });
  };

  // Activar o desactivar eliminación de productos de orden solo para owner
  const handleOnlyOwnerCanDeleteOrderItemsChange = async (enabled) => {
    setOnlyOwnerCanDeleteOrderItems(enabled);
    printingService.setOnlyOwnerCanDeleteOrderItems(enabled);
    const result = await printingService.saveRestaurantSettingsToBackend({ onlyOwnerCanDeleteOrderItems: enabled });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({
      type: 'success',
      text: enabled
        ? 'Solo el dueño podrá eliminar productos de pedidos en todo el restaurante'
        : 'Los usuarios con acceso podrán eliminar productos de pedidos'
    });
  };

  // Activar o desactivar prevención de reimpresión duplicada en actualizaciones
  const handleAvoidDuplicateKitchenUpdatePrintChange = async (enabled) => {
    setAvoidDuplicateKitchenUpdatePrint(enabled);
    printingService.setAvoidDuplicateKitchenUpdatePrint(enabled);
    const result = await printingService.saveRestaurantSettingsToBackend({ avoidDuplicateKitchenUpdatePrint: enabled });

    if (!result.success) {
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: `No se pudo guardar en el restaurante: ${result.error}. Se restauró el valor compartido.`,
      });
      return;
    }

    setMessage({
      type: 'success',
      text: enabled
        ? 'No se reimprimirá la misma comanda al actualizar o reenviar a cocina'
        : 'Se permitirá reimprimir la comanda al actualizar o reenviar'
    });
  };

  // Guardar impresora seleccionada
  const handlePrinterSelect = (printerName) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('selectedPrinter', printerName);
    setMessage({
      type: 'success',
      text: `Impresora "${printerName}" seleccionada para pruebas`
    });
  };

  // Establecer impresora predeterminada para comandas
  const handleSetDefaultPrinter = (printerName) => {
    setDefaultPrinter(printerName);
    printingService.setDefaultPrinter(printerName);
    setMessage({
      type: 'success',
      text: `"${printerName}" establecida como impresora predeterminada para comandas de cocina`
    });
  };

  // Remover impresora predeterminada
  const handleRemoveDefaultPrinter = () => {
    setDefaultPrinter('');
    printingService.removeDefaultPrinter();
    setMessage({
      type: 'info',
      text: 'Impresora predeterminada removida. Las comandas no se imprimirán automáticamente.'
    });
  };

  // Imprimir página de prueba
  const handleTestPrint = async (printerName = selectedPrinter) => {
    if (!printerName) {
      setMessage({
        type: 'error',
        text: 'Error: No se especificó impresora'
      });
      return;
    }

    setPrinting(true);
    setMessage({ type: 'info', text: `Enviando página de prueba a ${printerName}...` });

    try {
      const response = await printingService.printTest(printerName);

      if (response.success) {
        setMessage({
          type: 'success',
          text: `Página de prueba enviada correctamente a ${printerName}`
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Error al imprimir: ' + response.error
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al enviar página de prueba'
      });
    } finally {
      setPrinting(false);
    }
  };

  // Imprimir comanda de prueba
  const handleTestKitchenOrder = async () => {
    if (!defaultPrinter) {
      setMessage({
        type: 'error',
        text: 'Establece una impresora predeterminada primero'
      });
      return;
    }

    setPrinting(true);
    setMessage({ type: 'info', text: 'Enviando comanda de prueba...' });

    // Crear orden de prueba con la estructura correcta del backend
    const testOrder = {
      _id: 'TEST-001',
      name: 'Cliente de Prueba', // Cliente sin guardar
      section: 'mostrador',
      foods: [
        {
          food: {
            title: 'Hamburguesa Clásica'
          },
          quantity: 2,
          comment: 'Sin cebolla'
        },
        {
          food: {
            title: 'Papas Fritas'
          },
          quantity: 1,
          comment: ''
        },
        {
          food: {
            title: 'Coca Cola'
          },
          quantity: 2,
          comment: 'Con hielo'
        }
      ],
      comment: 'Orden de prueba para verificar impresión de comandas'
    };

    try {
      const response = await printingService.printKitchenOrder(testOrder);

      if (response.success) {
        setMessage({
          type: 'success',
          text: 'Comanda de prueba enviada correctamente'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Error al imprimir comanda: ' + response.error
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al enviar comanda de prueba'
      });
    } finally {
      setPrinting(false);
    }
  };

  // ============ FUNCIONES PARA MULTI-IMPRESORA ============

  // Cargar categorías con sus printDestinations
  const loadCategoriesForPrinting = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoriesService.getCategories();
      if (response.success && response.categories) {
        setCategories(response.categories);
        // Inicializar mapa de categoría → roles desde los datos de la DB
        const map = {};
        response.categories.forEach(cat => {
          map[cat._id] = cat.printDestinations || [];
        });
        setCategoryPrintMap(map);
      }
    } catch (error) {
      console.error('Error loading categories for printing:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Cargar secciones de extras detectadas desde productos
  const loadExtraSectionsForPrinting = async () => {
    setLoadingExtraSections(true);
    try {
      const response = await productsService.getProducts();
      if (response.success && Array.isArray(response.foods)) {
        const names = new Set();
        const sectionProducts = {};
        response.foods.forEach(food => {
          const productName = (food?.title || food?.name || '').trim();
          (food.extraSections || []).forEach(section => {
            const sectionName = typeof section?.sectionName === 'string' ? section.sectionName.trim() : '';
            if (sectionName) {
              names.add(sectionName);

              if (!sectionProducts[sectionName]) {
                sectionProducts[sectionName] = new Set();
              }

              if (productName) {
                sectionProducts[sectionName].add(productName);
              }
            }
          });
        });
        setDetectedExtraSections(Array.from(names).sort((a, b) => a.localeCompare(b, 'es')));
        const normalizedSectionProducts = {};
        Object.entries(sectionProducts).forEach(([sectionName, products]) => {
          normalizedSectionProducts[sectionName] = Array.from(products).sort((a, b) => a.localeCompare(b, 'es'));
        });
        setExtraSectionProductMap(normalizedSectionProducts);
      } else {
        setDetectedExtraSections([]);
        setExtraSectionProductMap({});
      }
    } catch (error) {
      console.error('Error loading extra sections for printing:', error);
      setDetectedExtraSections([]);
      setExtraSectionProductMap({});
    } finally {
      setLoadingExtraSections(false);
    }
  };

  // Asignar impresora a un rol
  const handleSetPrinterRole = (role, printerName) => {
    printerConfigService.setPrinterForRole(role, printerName);
    setPrinterRoles(printerConfigService.getPrinterRoles());
    setMessage({
      type: 'success',
      text: `Impresora "${printerName}" asignada a ${printerConfigService.getRoleLabels()[role] || role}`
    });
  };

  // Remover impresora de un rol
  const handleRemovePrinterRole = (role) => {
    printerConfigService.removePrinterRole(role);
    setPrinterRoles(printerConfigService.getPrinterRoles());
    setMessage({
      type: 'info',
      text: `Impresora removida de ${printerConfigService.getRoleLabels()[role] || role}`
    });
  };

  // Toggle rol de impresión para una categoría
  const handleToggleCategoryRole = (categoryId, role) => {
    setCategoryPrintMap(prev => {
      const current = prev[categoryId] || [];
      const updated = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
      return { ...prev, [categoryId]: updated };
    });
  };

  // Guardar destinos de impresión de todas las categorías en la DB
  const handleSavePrintDestinations = async () => {
    setSavingPrintDestinations(true);
    try {
      const updates = Object.entries(categoryPrintMap).map(([categoryId, printDestinations]) => ({
        categoryId,
        printDestinations
      }));
      await categoriesService.batchUpdatePrintDestinations(updates);
      setMessage({
        type: 'success',
        text: 'Destinos de impresión guardados correctamente'
      });
    } catch (error) {
      console.error('Error saving print destinations:', error);
      setMessage({
        type: 'error',
        text: 'Error al guardar destinos de impresión: ' + error.message
      });
    } finally {
      setSavingPrintDestinations(false);
    }
  };

  // Toggle rol de impresión para una sección de extras
  const handleToggleExtraSectionRole = (sectionName, role) => {
    setExtraSectionPrintMap(prev => {
      const current = prev[sectionName] || [];
      const updated = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
      return { ...prev, [sectionName]: updated };
    });
  };

  // Guardar destinos de impresión para secciones de extras (configuración global)
  const handleSaveExtraSectionPrintDestinations = async () => {
    setSavingExtraSectionDestinations(true);
    try {
      const payload = {};
      Object.entries(extraSectionPrintMap).forEach(([sectionName, roles]) => {
        const cleanName = typeof sectionName === 'string' ? sectionName.trim() : '';
        if (!cleanName) {
          return;
        }
        payload[cleanName] = Array.isArray(roles) ? roles : [];
      });

      printingService.setExtraSectionPrintDestinations(payload);
      const result = await printingService.saveRestaurantSettingsToBackend({
        extraSectionPrintDestinations: payload,
      });

      if (!result.success) {
        await rollbackRestaurantSettingsFromBackend();
        setMessage({
          type: 'error',
          text: `Error al guardar destinos de extras: ${result.error}`,
        });
        return;
      }

      setExtraSectionPrintMap(printingService.getExtraSectionPrintDestinations());
      setMessage({
        type: 'success',
        text: 'Destinos de impresión para secciones de extras guardados correctamente',
      });
    } catch (error) {
      console.error('Error saving extra section print destinations:', error);
      await rollbackRestaurantSettingsFromBackend();
      setMessage({
        type: 'error',
        text: 'Error al guardar destinos de impresión para extras: ' + error.message,
      });
    } finally {
      setSavingExtraSectionDestinations(false);
    }
  };

  // Imprimir prueba en una impresora de rol específico
  const handleTestRolePrint = async (role) => {
    const printerName = printerRoles[role];
    if (!printerName) {
      setMessage({ type: 'error', text: `No hay impresora asignada a ${printerConfigService.getRoleLabels()[role]}` });
      return;
    }
    setPrinting(true);
    setMessage({ type: 'info', text: `Enviando prueba a ${printerName} (${printerConfigService.getRoleLabels()[role]})...` });
    try {
      const result = await printingService.printTest(printerName);
      if (result.success) {
        setMessage({ type: 'success', text: `Prueba enviada a ${printerName}` });
      } else {
        setMessage({ type: 'error', text: 'Error: ' + result.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al imprimir prueba' });
    } finally {
      setPrinting(false);
    }
  };

  // ============ FUNCIONES PARA SUSCRIPCIÓN ============

  // Cargar información de la suscripción
  const loadSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const response = await subscriptionService.getCurrentSubscription();
      if (response.success && response.data && response.data.subscription) {
        setSubscription(response.data.subscription);
        setSubscriptionData(response.data); // Guardar toda la data incluyendo isInGracePeriod
      } else {
        setMessage({
          type: 'error',
          text: 'Error al cargar suscripción: ' + response.message
        });
      }
    } catch (error) {
      console.error('Error al cargar suscripción:', error);
      setMessage({
        type: 'error',
        text: 'Error al cargar información de suscripción'
      });
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Cancelar suscripción
  const handleCancelSubscription = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso al finalizar el período actual.')) {
      return;
    }

    setCancelingSubscription(true);
    try {
      const response = await subscriptionService.cancelSubscription(subscription._id);
      if (response.success) {
        setMessage({
          type: 'success',
          text: 'Suscripción cancelada exitosamente'
        });
        loadSubscription();
      } else {
        setMessage({
          type: 'error',
          text: 'Error al cancelar: ' + response.message
        });
      }
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      setMessage({
        type: 'error',
        text: 'Error al cancelar la suscripción'
      });
    } finally {
      setCancelingSubscription(false);
    }
  };

  // Navegar a planes
  const handleChangePlan = () => {
    navigate('/subscription/plans');
  };

  // Pago directo: inicia checkout con plan mensual y redirige a MercadoPago
  const handleRenewDirect = async () => {
    try {
      setRenewingSubscription(true);
      setMessage({ type: 'info', text: 'Iniciando proceso de pago...' });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const restaurantId = user.restaurant;
      if (!restaurantId) {
        setMessage({ type: 'error', text: 'No se encontró información del restaurante' });
        return;
      }
      const response = await subscriptionService.initiateCheckout(restaurantId, 'monthly');
      if (!response.success) {
        setMessage({ type: 'error', text: response.message || 'Error al procesar el pago' });
        return;
      }
      const initPoint = response.data?.mercadoPago?.initPoint;
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        setMessage({ type: 'error', text: 'No se pudo iniciar el proceso de pago. Intenta de nuevo.' });
      }
    } catch (error) {
      console.error('Error al renovar suscripción:', error);
      setMessage({ type: 'error', text: error.message || 'Error al iniciar el pago' });
    } finally {
      setRenewingSubscription(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener estado visual
  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', text: 'Activa' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expirada' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelada' },
      trial: { color: 'bg-blue-100 text-blue-800', text: 'Prueba' },
      suspended: { color: 'bg-orange-100 text-orange-800', text: 'Suspendida' },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
  };

  // ============ FUNCIONES PARA USUARIOS ============

  // Cargar usuarios del restaurante
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersService.getUsersByRestaurant();
      if (response.success) {
        setUsers(response.data);
      } else {
        setMessage({
          type: 'error',
          text: response.message || 'Error al cargar usuarios'
        });
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setMessage({
        type: 'error',
        text: 'Error al cargar usuarios'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Abrir modal para crear usuario
  const handleCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      userName: '',
      email: '',
      password: '',
      phone: ''
    });
    setShowUserModal(true);
  };

  // Abrir modal para editar usuario
  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      userName: user.userName,
      email: user.email,
      password: '', // No mostramos la contraseña
      phone: user.phone || ''
    });
    setShowUserModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserFormData({
      userName: '',
      email: '',
      password: '',
      phone: ''
    });
  };

  // Guardar usuario (crear o editar)
  const handleSaveUser = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!userFormData.userName || !userFormData.email) {
      setMessage({
        type: 'error',
        text: 'El nombre y correo son obligatorios'
      });
      return;
    }

    if (!editingUser && !userFormData.password) {
      setMessage({
        type: 'error',
        text: 'La contraseña es obligatoria para nuevos usuarios'
      });
      return;
    }

    setLoadingUsers(true);

    try {
      let response;
      if (editingUser) {
        // Editar usuario existente
        const updateData = {
          userName: userFormData.userName,
          email: userFormData.email,
          phone: userFormData.phone
        };
        // Solo incluir password si se proporcionó uno nuevo
        if (userFormData.password) {
          updateData.password = userFormData.password;
        }
        response = await usersService.updateEmployee(editingUser._id, updateData);
      } else {
        // Crear nuevo usuario
        response = await usersService.createEmployee(userFormData);
      }

      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message
        });
        handleCloseModal();
        loadUsers();
      } else {
        setMessage({
          type: 'error',
          text: response.message
        });
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setMessage({
        type: 'error',
        text: 'Error al guardar usuario'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${userName}"?`)) {
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await usersService.deleteEmployee(userId);
      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message
        });
        loadUsers();
      } else {
        setMessage({
          type: 'error',
          text: response.message
        });
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setMessage({
        type: 'error',
        text: 'Error al eliminar usuario'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const extraSectionNames = Array.from(
    new Set([
      ...detectedExtraSections,
      ...Object.keys(extraSectionPrintMap || {}),
    ]),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  return (
    <div className="h-full bg-cream-50 flex flex-col gap-4 md:gap-6 p-3 md:p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex-1 overflow-y-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-brown-900 mb-2">
            Configuración General
          </h1>
          <p className="text-brown-600">
            Configura las opciones generales del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('printers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'printers'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center">
                <PrinterIcon className="w-5 h-5 mr-2" />
                Impresoras
              </div>

              
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'subscription'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <CreditCardIcon className="w-5 h-5 mr-2" />
                  Suscripción
                </div>
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'users'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2" />
                  Usuarios
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Mensaje de estado */}
        {message.text && (
          <div className={`p-4 rounded-lg border ${message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : message.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            <div className="flex items-center">
              {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'info' && <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Contenido según pestaña activa */}
        {activeTab === 'printers' && (
          <>
            {/* Estado de impresión automática */}
            {serviceStatus === 'online' && (
              <div className={`p-4 rounded-lg border ${defaultPrinter
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
                }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${defaultPrinter ? 'bg-green-500' : 'bg-orange-500'
                    }`}></div>
                  <div>
                    <p className={`font-medium ${defaultPrinter ? 'text-green-800' : 'text-orange-800'
                      }`}>
                      {defaultPrinter
                        ? 'Impresión automática: ACTIVADA'
                        : 'Impresión automática: DESACTIVADA'
                      }
                    </p>
                    <p className={`text-sm ${defaultPrinter ? 'text-green-700' : 'text-orange-700'
                      }`}>
                      {defaultPrinter
                        ? `Las comandas se enviarán automáticamente a "${defaultPrinter}" al crear pedidos`
                        : 'Configure una impresora predeterminada para activar la impresión automática de comandas'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sección de Impresoras */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <PrinterIcon className="w-6 h-6 text-brown-600 mr-3" />
                  <h2 className="text-xl font-semibold text-brown-900">
                    Configuración de Impresoras
                  </h2>
                  {/* Botón permanente para descargar el software de impresión */}
                  <a
                    href="https://github.com/AMunozSuarez/Gestion-Restaurante/releases/download/V1.0/RestaurantPrintingServiceInstaller.exe"
                    download="RestaurantPrintingServiceInstaller.exe"
                    className="inline-flex items-center px-3 py-2 border border-blue-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ml-4"
                    style={{ textDecoration: 'none' }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar Servicio de Impresión
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Estado del servicio */}
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${serviceStatus === 'online'
                        ? 'bg-green-500'
                        : serviceStatus === 'offline'
                          ? 'bg-red-500'
                          : 'bg-yellow-500 animate-pulse'
                      }`}></div>
                    <span className="text-sm text-gray-600">
                      {serviceStatus === 'online'
                        ? 'Servicio conectado'
                        : serviceStatus === 'offline'
                          ? 'Servicio desconectado'
                          : 'Verificando...'}
                    </span>
                  </div>

                  {/* Botón actualizar */}
                  <button
                    onClick={checkServiceAndLoadPrinters}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
              </div>

              {/* Lista de impresoras */}
              {serviceStatus === 'checking' ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="w-10 h-10 text-yellow-500 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-600 font-medium">Verificando servicio de impresión...</p>
                  <p className="text-sm text-gray-500 mt-1">Espera un momento mientras se detectan impresoras</p>
                </div>
              ) : serviceStatus === 'online' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Impresoras disponibles:
                    </label>

                    {printers.length > 0 ? (
                      <div className="grid gap-3">
                        {printers.map((printer, index) => {
                          // Manejar tanto el formato string como objeto (camelCase desde la API)
                          const printerName = typeof printer === 'string' ? printer : (printer.printerName || printer.PrinterName);
                          const printerStatus = typeof printer === 'object' ? (printer.status || printer.Status || 'Available') : 'Available';
                          const isSystemDefault = typeof printer === 'object' ? (printer.isDefault || printer.IsDefault || false) : false;
                          const isAppDefault = defaultPrinter === printerName;

                          return (
                            <div
                              key={`${printerName}-${index}`}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <PrinterIcon className="w-5 h-5 text-gray-500 mr-3" />
                                  <div>
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-900">{printerName}</span>
                                      {isSystemDefault && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                          Predeterminada Sistema
                                        </span>
                                      )}
                                      {isAppDefault && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                          Comandas Automáticas
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">Estado: {printerStatus}</div>
                                  </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex items-center space-x-2">
                                  {/* Botón de prueba */}
                                  <button
                                    onClick={() => handleTestPrint(printerName)}
                                    disabled={printing}
                                    className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <PrinterIcon className="w-3 h-3 mr-1" />
                                    {printing && selectedPrinter === printerName ? 'Imprimiendo...' : 'Prueba'}
                                  </button>

                                  {/* Botón establecer como predeterminada */}
                                  {!isAppDefault ? (
                                    <button
                                      onClick={() => handleSetDefaultPrinter(printerName)}
                                      className="inline-flex items-center px-3 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      Establecer como predeterminada
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleRemoveDefaultPrinter}
                                      className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                      Quitar predeterminada
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <PrinterIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron impresoras</p>
                        <button
                          onClick={checkServiceAndLoadPrinters}
                          className="mt-2 text-blue-600 hover:text-blue-500"
                        >
                          Intentar de nuevo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botón de comanda de prueba */}
                  {defaultPrinter && (
                    <div className="border-t pt-4">
                      <button
                        onClick={handleTestKitchenOrder}
                        disabled={printing}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        <PrinterIcon className="w-4 h-4 mr-2" />
                        {printing ? 'Imprimiendo...' : 'Probar comanda de cocina'}
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Envía una comanda de prueba a la impresora predeterminada: <strong>{defaultPrinter}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    No se puede conectar al servicio de impresión
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Es necesario instalar el servicio de impresión para poder usar las impresoras.
                  </p>
                  <a
                    href="https://github.com/AMunozSuarez/Gestion-Restaurante/releases/download/V1.0/RestaurantPrintingServiceInstaller.exe"
                    download="RestaurantPrintingServiceInstaller.exe"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar Servicio de Impresión
                  </a>
                  <p className="text-xs text-gray-400 mt-2">
                    Después de descargar, ejecute el instalador, actualice y listo!
                  </p>
                </div>
              )}
            </div>

            {/* Configuración de fuente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <CogIcon className="w-6 h-6 text-brown-600 mr-3" />
                <h2 className="text-xl font-semibold text-brown-900">Letra en comandas de cocina</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Configura si las comandas de cocina se imprimen en <strong>negrita</strong>. Los tickets de cliente siempre usan fuente normal.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción Normal */}
                <button
                  onClick={() => handleSaveFontSettings({ fontSize: 9, bold: false })}
                  disabled={savingFont}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${!fontSettings.bold
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Normal</span>
                    {!fontSettings.bold && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Fuente 9pt • Regular • ~32 car/línea</p>
                  <p className="mt-2 font-mono text-xs text-gray-700 border rounded p-1 bg-gray-50">
                    2x Producto         $1.200
                  </p>
                </button>

                {/* Opción Grande */}
                <button
                  onClick={() => handleSaveFontSettings({ fontSize: 10, bold: true })}
                  disabled={savingFont}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${fontSettings.bold
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800">Grande</span>
                    {fontSettings.bold && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Negrita • Solo en comandas de cocina</p>
                  <p className="mt-2 font-mono text-xs font-bold text-gray-700 border rounded p-1 bg-gray-50">
                    2x Producto     $1.200
                  </p>
                </button>
              </div>

              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Encabezado de comanda en grande</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Aplica negrita al detalle del encabezado (N. orden, cliente/mesa, sección y hora)..
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveFontSettings({ kitchenHeaderBold: !fontSettings.kitchenHeaderBold })}
                    disabled={savingFont}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 ${fontSettings.kitchenHeaderBold ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                    aria-pressed={fontSettings.kitchenHeaderBold}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${fontSettings.kitchenHeaderBold ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              </div>

              {savingFont && (
                <p className="mt-3 text-sm text-gray-500 flex items-center">
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Guardando...
                </p>
              )}

              <div className="mt-4 border-t pt-4">
                <button
                  onClick={handleFontTestPrint}
                  disabled={testingFont || !defaultPrinter}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  {testingFont ? 'Imprimiendo...' : 'Imprimir prueba de fuente'}
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  {defaultPrinter
                    ? `Imprime en: ${defaultPrinter}`
                    : 'Requiere impresora predeterminada configurada arriba'}
                </p>
              </div>
            </div>

            {/* Caja Electrónica - TESTEO */}
            {printingService.isCurrentUserOwner() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h2 className="text-xl font-semibold text-brown-900">Caja Electrónica</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Configura y prueba la apertura de caja electrónica
              </p>
              
              {/* Opciones de caja (solo dueño) */}
              <div className="mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Permitir abrir caja desde cualquier cuenta</p>
                    <p className="text-xs text-gray-500">Si está activo, usuarios no-owner podrán abrir la caja.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleDrawerAlwaysOpen(!drawerAlwaysOpen)}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${drawerAlwaysOpen ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                    aria-pressed={drawerAlwaysOpen}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${drawerAlwaysOpen ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Abrir caja automáticamente al cerrar un pedido</p>
                    <p className="text-xs text-gray-500">Si está activo, la caja se abrirá al cerrar un pedido.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleDrawerOpenOnCloseOrder(!drawerOpenOnCloseOrder)}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${drawerOpenOnCloseOrder ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                    aria-pressed={drawerOpenOnCloseOrder}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${drawerOpenOnCloseOrder ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              </div>

              {/* Selector de impresora */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impresora con caja
                </label>
                <select
                  value={drawerPrinter}
                  onChange={(e) => handleDrawerPrinterChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">-- Selecciona una impresora --</option>
                  {allPrinters.map((printer) => (
                    <option key={printer.printerName} value={printer.printerName}>
                      {printer.printerName}
                    </option>
                  ))}
                </select>
                {drawerPrinter && (
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ Configurada: {drawerPrinter}
                  </p>
                )}
              </div>
              
              {/* Tecla rápida para abrir caja */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tecla rápida para abrir caja</label>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-white text-sm text-gray-800">
                    {drawerHotkey ? drawerHotkey.toUpperCase() : 'Ninguna'}
                  </div>
                  <button
                    onClick={() => {
                      if (capturingHotkey) {
                        setCapturingHotkey(false);
                        return;
                      }
                      setCapturingHotkey(true);
                      setMessage({ type: 'info', text: 'Presiona la tecla que quieras asignar...' });
                    }}
                    className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${capturingHotkey ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {capturingHotkey ? 'Presiona...' : 'Asignar tecla'}
                  </button>
                  <button
                    onClick={() => {
                      setDrawerHotkey('');
                      printingService.setDrawerHotkey('');
                      printingService.saveRestaurantSettingsToBackend({ drawerHotkey: '' }).catch(() => {});
                      setMessage({ type: 'success', text: 'Tecla borrada' });
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Borrar
                  </button>
                </div>
                {capturingHotkey && (
                  <p className="text-xs text-gray-500 mt-2">Presiona una tecla del teclado para asignarla. Esc para cancelar.</p>
                )}
              </div>
              
              {/* Botón de prueba */}
              <button
                onClick={handleTestDrawer}
                disabled={testingDrawer || !drawerPrinter}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {testingDrawer ? 'Abriendo...' : 'Probar Caja'}
              </button>
              {!drawerPrinter && (
                <p className="text-xs text-amber-600 mt-2">✓ Selecciona una impresora para probar</p>
              )}
            </div>

            )}

            {/* Modo de impresión al actualizar comandas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <CogIcon className="w-6 h-6 text-brown-600 mr-3" />
                <h2 className="text-xl font-semibold text-brown-900">Actualizacion de comandas</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Configura como se imprimen las comandas cuando se agregan productos nuevos a un pedido existente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción: Solo productos nuevos */}
                <button
                  onClick={() => handleUpdatePrintModeChange('new-only')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${updatePrintMode === 'new-only'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Solo productos nuevos</span>
                    {updatePrintMode === 'new-only' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Imprime unicamente los productos que se acaban de agregar</p>
                  <div className="mt-2 text-xs text-gray-700 border rounded p-2 bg-gray-50 font-mono">
                    <div className="font-bold">ACTUALIZACION PEDIDO</div>
                    <div className="mt-1">2x Bebida Extra</div>
                    <div>1x Postre Nuevo</div>
                  </div>
                </button>

                {/* Opción: Toda la comanda */}
                <button
                  onClick={() => handleUpdatePrintModeChange('all')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${updatePrintMode === 'all'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">Toda la comanda</span>
                    {updatePrintMode === 'all' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Imprime todos los productos, los nuevos marcados con *</p>
                  <div className="mt-2 text-xs text-gray-700 border rounded p-2 bg-gray-50 font-mono">
                    <div className="font-bold">ACTUALIZACION PEDIDO</div>
                    <div className="mt-1">2x Hamburguesa</div>
                    <div>1x Papas Fritas</div>
                    <div>* 2x Bebida Extra</div>
                    <div>* 1x Postre Nuevo</div>
                  </div>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Recomendacion:</strong> "Solo productos nuevos" es mas eficiente y evita confusion en cocina. 
                  Usa "Toda la comanda" si necesitas ver el contexto completo del pedido.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Imprimir al eliminar productos</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Si está activo, al reenviar/actualizar a cocina se imprimirá también cuando solo elimines productos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrintOnDeletedItemsUpdateChange(!printOnDeletedItemsUpdate)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${printOnDeletedItemsUpdate ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                      aria-pressed={printOnDeletedItemsUpdate}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${printOnDeletedItemsUpdate ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Reimprimir ticket al cerrar mesa</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Si está activo, al completar y cerrar una mesa se volverá a imprimir el ticket del cliente automáticamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReprintTicketOnCloseTableChange(!reprintTicketOnCloseTable)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${reprintTicketOnCloseTable ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                      aria-pressed={reprintTicketOnCloseTable}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${reprintTicketOnCloseTable ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="mt-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
                  <p className="text-sm font-semibold text-amber-900 mb-3">Opciones avanzadas (solo dueño)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-amber-200 rounded-lg bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Solo dueño puede cerrar mesa</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Si está activo, usuarios que no sean dueño no podrán cerrar mesas.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOnlyOwnerCanCloseTableChange(!onlyOwnerCanCloseTable)}
                          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${onlyOwnerCanCloseTable ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                          aria-pressed={onlyOwnerCanCloseTable}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${onlyOwnerCanCloseTable ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-amber-200 rounded-lg bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">No reimprimir al actualizar/reenviar</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Evita reimprimir la misma actualización de comanda cuando se envía de nuevo sin cambios.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAvoidDuplicateKitchenUpdatePrintChange(!avoidDuplicateKitchenUpdatePrint)}
                          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${avoidDuplicateKitchenUpdatePrint ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                          aria-pressed={avoidDuplicateKitchenUpdatePrint}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${avoidDuplicateKitchenUpdatePrint ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-amber-200 rounded-lg bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Solo dueño puede eliminar productos</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Si está activo, empleados no podrán eliminar productos de pedidos ya creados.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOnlyOwnerCanDeleteOrderItemsChange(!onlyOwnerCanDeleteOrderItems)}
                          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${onlyOwnerCanDeleteOrderItems ? 'bg-green-600 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                          aria-pressed={onlyOwnerCanDeleteOrderItems}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${onlyOwnerCanDeleteOrderItems ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Asignación de Impresoras por Sección */}
            {serviceStatus === 'online' && printers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <CogIcon className="w-6 h-6 text-brown-600 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-brown-900">Asignación de Impresoras por Sección</h2>
                    <p className="text-sm text-gray-500">Asigna una impresora física a cada sección del restaurante</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {printerConfigService.getAvailableRoles().map(role => {
                    const roleLabels = printerConfigService.getRoleLabels();
                    const assignedPrinter = printerRoles[role] || '';
                    return (
                      <div key={role} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center min-w-0">
                          <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${assignedPrinter ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                          <div>
                            <span className="font-medium text-gray-900">{roleLabels[role]}</span>
                            {assignedPrinter && (
                              <p className="text-xs text-gray-500">{assignedPrinter}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={assignedPrinter}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSetPrinterRole(role, e.target.value);
                              } else {
                                handleRemovePrinterRole(role);
                              }
                            }}
                            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                          >
                            <option value="">Sin asignar</option>
                            {printers.map((p, index) => {
                              const pName = typeof p === 'string' ? p : (p.printerName || p.PrinterName);
                              return <option key={`${pName}-${index}`} value={pName}>{pName}</option>;
                            })}
                          </select>
                          {assignedPrinter && (
                            <button
                              onClick={() => handleTestRolePrint(role)}
                              disabled={printing}
                              className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                            >
                              <PrinterIcon className="w-3 h-3 mr-1" />
                              Probar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Esta configuración es local a este equipo. Cada computadora puede tener sus propias impresoras asignadas.
                </p>
              </div>
            )}

            {/* Impresión por Categoría */}
            {serviceStatus === 'online' && Object.keys(printerRoles).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CogIcon className="w-6 h-6 text-brown-600 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-brown-900">Impresión por Categoría</h2>
                      <p className="text-sm text-gray-500">Define a qué secciones se envían los productos de cada categoría</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSavePrintDestinations}
                    disabled={savingPrintDestinations}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {savingPrintDestinations ? (
                      <><ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                    ) : (
                      <><CheckCircleIcon className="w-4 h-4 mr-2" /> Guardar cambios</>
                    )}
                  </button>
                </div>

                {loadingCategories ? (
                  <div className="text-center py-8">
                    <ArrowPathIcon className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Cargando categorías...</p>
                  </div>
                ) : categories.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Categoría</th>
                          {printerConfigService.getAvailableRoles().map(role => {
                            const label = printerConfigService.getRoleLabels()[role];
                            const hasPrinter = !!printerRoles[role];
                            return (
                              <th key={role} className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                                <div className="flex flex-col items-center">
                                  <span>{label}</span>
                                  {hasPrinter ? (
                                    <span className="text-xs text-gray-400 font-normal">{printerRoles[role]}</span>
                                  ) : (
                                    <span className="text-xs text-red-400 font-normal">Sin impresora</span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat, index) => {
                          const catRoles = categoryPrintMap[cat._id] || [];
                          return (
                            <tr key={cat._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">{cat.title}</span>
                                  {!cat.isAvailable && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">Inactiva</span>
                                  )}
                                </div>
                              </td>
                              {printerConfigService.getAvailableRoles().map(role => {
                                const isChecked = catRoles.includes(role);
                                const hasPrinter = !!printerRoles[role];
                                return (
                                  <td key={role} className="text-center py-3 px-4">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!hasPrinter}
                                      onChange={() => handleToggleCategoryRole(cat._id, role)}
                                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-30"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">No hay categorías creadas aún</p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Las categorías sin impresora asignada se enviarán a la impresora predeterminada. Los cambios se guardan en el servidor y aplican a todos los dispositivos.
                </p>
              </div>
            )}

            {/* Impresión de Extras por Sección */}
            {serviceStatus === 'online' && Object.keys(printerRoles).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CogIcon className="w-6 h-6 text-brown-600 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-brown-900">Impresión de Extras por Sección</h2>
                      <p className="text-sm text-gray-500">Tiene prioridad sobre la categoría del producto. Si no está configurada, el extra hereda la categoría.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveExtraSectionPrintDestinations}
                    disabled={savingExtraSectionDestinations}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {savingExtraSectionDestinations ? (
                      <><ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                    ) : (
                      <><CheckCircleIcon className="w-4 h-4 mr-2" /> Guardar cambios</>
                    )}
                  </button>
                </div>

                {loadingExtraSections ? (
                  <div className="text-center py-8">
                    <ArrowPathIcon className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Cargando secciones de extras...</p>
                  </div>
                ) : extraSectionNames.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sección de extras</th>
                          {printerConfigService.getAvailableRoles().map(role => {
                            const label = printerConfigService.getRoleLabels()[role];
                            const hasPrinter = !!printerRoles[role];
                            return (
                              <th key={role} className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                                <div className="flex flex-col items-center">
                                  <span>{label}</span>
                                  {hasPrinter ? (
                                    <span className="text-xs text-gray-400 font-normal">{printerRoles[role]}</span>
                                  ) : (
                                    <span className="text-xs text-red-400 font-normal">Sin impresora</span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {extraSectionNames.map((sectionName, index) => {
                          const sectionRoles = extraSectionPrintMap[sectionName] || [];
                          const sectionProducts = extraSectionProductMap[sectionName] || [];
                          const visibleProducts = sectionProducts.slice(0, 2);
                          const hiddenProductsCount = sectionProducts.length - visibleProducts.length;

                          return (
                            <tr key={sectionName} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                              <td className="py-3 px-4">
                                <div>
                                  <span className="font-medium text-gray-900">{sectionName}</span>
                                  {sectionProducts.length > 0 && (
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      {visibleProducts.join(', ')}{hiddenProductsCount > 0 ? ` +${hiddenProductsCount}` : ''}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {printerConfigService.getAvailableRoles().map(role => {
                                const isChecked = sectionRoles.includes(role);
                                const hasPrinter = !!printerRoles[role];
                                return (
                                  <td key={role} className="text-center py-3 px-4">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!hasPrinter}
                                      onChange={() => handleToggleExtraSectionRole(sectionName, role)}
                                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-30"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">No se detectaron secciones de extras en los productos.</p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Puedes seleccionar 1, 2 o 3 destinos para cada sección. Si una sección no tiene destinos, sus extras se imprimirán usando la categoría del producto.
                </p>
              </div>
            )}

            {/* Información de uso */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <CogIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Cómo usar las impresoras:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li><strong>Predeterminada:</strong> Se usará para imprimir cuando no haya impresoras por sección configuradas</li>
                    <li><strong>Impresoras por Sección:</strong> Asigna impresoras a Cocina, Barra y/o Caja para enviar automáticamente</li>
                    <li><strong>Impresión por Categoría:</strong> Configura a qué secciones se envían los productos de cada categoría</li>
                    <li>Si una categoría no tiene sección asignada, se imprimirá en la impresora predeterminada</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Contenido de Suscripción */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {loadingSubscription ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="w-12 h-12 text-green-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Cargando información de suscripción...</p>
              </div>
            ) : subscription ? (
              <>
                {/* Alertas según estado - ARRIBA */}
                {subscription.status === 'expired' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 mb-1">
                          Suscripción Expirada
                        </h4>
                        <p className="text-sm text-red-700">
                          Tu suscripción ha expirado. Renueva ahora para seguir usando el sistema sin interrupciones.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {subscription.status === 'suspended' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 mb-1">
                          Cuenta Suspendida
                        </h4>
                        <p className="text-sm text-red-700">
                          Tu cuenta ha sido suspendida por falta de pago. Renueva tu suscripción para reactivar el servicio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {subscription.status === 'active' && subscription.plan === 'trial' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">
                          Período de Prueba Activo
                        </h4>
                        <p className="text-sm text-blue-700">
                          Estás usando el período de prueba gratuito. Actualiza a un plan de pago para continuar después de {Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))} días.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card principal de suscripción */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          Plan {subscription.plan === 'trial' ? 'Prueba' :
                            subscription.plan === 'monthly' ? 'Mensual' :
                              subscription.plan === 'quarterly' ? 'Trimestral' : 'Anual'}
                        </h2>
                        <p className="text-green-100">
                          Gestión completa de tu restaurante
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold ${getStatusBadge(subscription.status).color
                          }`}>
                          {getStatusBadge(subscription.status).text}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Información de fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start space-x-3">
                        <CalendarIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Fecha de inicio</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(subscription.startDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <CalendarIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Fecha de vencimiento</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <ShieldCheckIcon className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Días restantes</p>
                          <p className="font-medium text-gray-900">
                            {Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} días
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Características del plan */}
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Características incluidas:</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Pedidos ilimitados
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Empleados ilimitados
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Gestión de productos
                        </li>
                        {/* <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Reportes y estadísticas
                        </li> */}
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Gestión de cajas
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          Soporte técnico
                        </li>
                      </ul>
                    </div>

                    {/* Acciones */}
                    <div className="border-t pt-4 flex flex-wrap gap-3">
                      {subscription.status === 'active' && subscription.plan !== 'trial' && (
                        <>
                          <button
                            onClick={handleRenewDirect}
                            disabled={renewingSubscription}
                            className="flex-1 min-w-[200px] inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                          >
                            <CreditCardIcon className="w-4 h-4 mr-2" />
                            {renewingSubscription ? 'Procesando...' : 'Renovar 30 días'}
                          </button>

                          <button
                            onClick={handleCancelSubscription}
                            disabled={cancelingSubscription}
                            className="flex-1 min-w-[200px] inline-flex justify-center items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                          >
                            <XCircleIcon className="w-4 h-4 mr-2" />
                            {cancelingSubscription ? 'Cancelando...' : 'Cancelar Suscripción'}
                          </button>
                        </>
                      )}

                      {subscription.plan === 'trial' && (
                        <button
                          onClick={handleChangePlan}
                          className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <CreditCardIcon className="w-5 h-5 mr-2" />
                          Actualizar a Plan de Pago
                        </button>
                      )}

                      {(subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'suspended') && (
                        <button
                          onClick={handleRenewDirect}
                          disabled={renewingSubscription}
                          className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                        >
                          <CreditCardIcon className="w-5 h-5 mr-2" />
                          {renewingSubscription ? 'Procesando...' : 'Renovar — Agregar 30 días'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Historial de pagos */}
                {subscription.paymentHistory && subscription.paymentHistory.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Historial de Pagos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {subscription.paymentHistory.slice(0, 5).map((payment, index) => {
                            // El método de pago viene del paymentProvider de la suscripción principal
                            const paymentMethod = subscription.paymentProvider || 'manual';
                            const displayMethod = paymentMethod === 'mercadopago' ? 'MercadoPago' :
                              paymentMethod === 'stripe' ? 'Stripe' :
                                paymentMethod === 'paypal' ? 'PayPal' :
                                  'Manual';

                            return (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {formatDate(payment.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  ${payment.amount?.toLocaleString('es-CL')} CLP
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {displayMethod}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'success'
                                      ? 'bg-green-100 text-green-800'
                                      : payment.status === 'failed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {payment.status === 'success' ? 'Aprobado' :
                                      payment.status === 'failed' ? 'Rechazado' :
                                        payment.status === 'refunded' ? 'Reembolsado' : payment.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay suscripción activa
                </h3>
                <p className="text-gray-600 mb-6">
                  Suscríbete para comenzar a usar todas las funcionalidades del sistema
                </p>
                <button
                  onClick={handleChangePlan}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <CreditCardIcon className="w-5 h-5 mr-2" />
                  Ver Planes Disponibles
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contenido de Usuarios */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Header con botón crear */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-brown-900">
                  Gestión de Usuarios
                </h2>
                <p className="text-brown-600">
                  Administra los empleados de tu restaurante
                </p>
              </div>
              <button
                onClick={handleCreateUser}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Nuevo Usuario
              </button>
            </div>

            {/* Tabla de usuarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loadingUsers ? (
                <div className="text-center py-12">
                  <ArrowPathIcon className="w-12 h-12 text-green-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Cargando usuarios...</p>
                </div>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Correo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teléfono
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.userName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.phone || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                              }`}>
                              {user.role === 'owner' ? 'Propietario' : 'Empleado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                              title="Editar"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            {user.role !== 'owner' && (
                              <button
                                onClick={() => handleDeleteUser(user._id, user.userName)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay usuarios registrados
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comienza agregando empleados a tu restaurante
                  </p>
                  <button
                    onClick={handleCreateUser}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Crear Primer Usuario
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de crear/editar usuario */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    name="userName"
                    value={userFormData.userName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userFormData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    disabled={editingUser !== null}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={userFormData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={userFormData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingUsers}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                  >
                    {loadingUsers ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;