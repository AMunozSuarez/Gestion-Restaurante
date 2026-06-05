import axios from 'axios';
import printerConfigService from './printerConfigService';
import restaurantService from './restaurantService';

// Configuracion base para el servicio de impresion
const PRINTING_SERVICE_URL = process.env.REACT_APP_PRINTING_SERVICE_URL || 'http://localhost:8088';

// Crear instancia especifica para el servicio de impresion
const printingApi = axios.create({
  baseURL: PRINTING_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

const RESTAURANT_SETTINGS_STORAGE_KEYS = {
  updatePrintMode: 'updatePrintMode',
  reprintTicketOnCloseTable: 'reprintTicketOnCloseTable',
  printOnDeletedItemsUpdate: 'printOnDeletedItemsUpdate',
  onlyOwnerCanCloseTable: 'onlyOwnerCanCloseTable',
  onlyOwnerCanDeleteOrderItems: 'onlyOwnerCanDeleteOrderItems',
  avoidDuplicateKitchenUpdatePrint: 'avoidDuplicateKitchenUpdatePrint',
  extraSectionPrintDestinations: 'extraSectionPrintDestinations',
  drawerPrinter: 'drawerPrinter',
  drawerAlwaysOpen: 'drawerAlwaysOpen',
  drawerConfigOwnerOnly: 'drawerConfigOwnerOnly',
  drawerHotkey: 'drawerHotkey',
  drawerOpenOnCloseOrder: 'drawerOpenOnCloseOrder',
};

const VALID_PRINT_ROLES = ['cocina', 'barra', 'caja'];

const DEFAULT_RESTAURANT_SETTINGS = {
  updatePrintMode: 'all',
  reprintTicketOnCloseTable: false,
  printOnDeletedItemsUpdate: false,
  onlyOwnerCanCloseTable: false,
  onlyOwnerCanDeleteOrderItems: false,
  avoidDuplicateKitchenUpdatePrint: false,
  extraSectionPrintDestinations: {},
  drawerPrinter: '',
  drawerAlwaysOpen: false,
  drawerConfigOwnerOnly: true,
  drawerHotkey: '',
  drawerOpenOnCloseOrder: false,
};

let restaurantSettingsCache = null;
let restaurantSettingsSyncPromise = null;

const DEFAULT_FONT_SETTINGS = {
  fontSize: 9,
  bold: false,
  kitchenHeaderBold: false,
};

const normalizeLocalFontSettings = (settings = {}) => {
  const parsedFontSize = Number(settings?.fontSize);

  return {
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : DEFAULT_FONT_SETTINGS.fontSize,
    bold: Boolean(settings?.bold),
    kitchenHeaderBold: Boolean(settings?.kitchenHeaderBold),
  };
};

const parseBooleanValue = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const readBooleanFromStorage = (key, fallback = false) => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return fallback;
  }
};

const readStringFromStorage = (key, fallback = '') => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const readJsonFromStorage = (key, fallback = {}) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const normalizeExtraSectionPrintDestinations = (value = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  Object.entries(value).forEach(([rawSectionName, rawRoles]) => {
    if (typeof rawSectionName !== 'string') {
      return;
    }

    const sectionName = rawSectionName.trim();
    if (!sectionName || !Array.isArray(rawRoles)) {
      return;
    }

    const dedupedRoles = [];
    rawRoles.forEach((role) => {
      if (typeof role === 'string' && VALID_PRINT_ROLES.includes(role) && !dedupedRoles.includes(role)) {
        dedupedRoles.push(role);
      }
    });

    normalized[sectionName] = dedupedRoles;
  });

  return normalized;
};

const normalizeRestaurantSettings = (settings = {}) => {
  const printing = settings?.printing || {};
  const permissions = settings?.permissions || {};

  const updatePrintMode = printing.updatePrintMode || settings.updatePrintMode || DEFAULT_RESTAURANT_SETTINGS.updatePrintMode;
  const rawExtraSectionPrintDestinations =
    printing.extraSectionPrintDestinations ?? settings.extraSectionPrintDestinations ?? DEFAULT_RESTAURANT_SETTINGS.extraSectionPrintDestinations;

  return {
    updatePrintMode: updatePrintMode === 'new-only' ? 'new-only' : 'all',
    reprintTicketOnCloseTable: parseBooleanValue(
      printing.reprintTicketOnCloseTable ?? settings.reprintTicketOnCloseTable,
      DEFAULT_RESTAURANT_SETTINGS.reprintTicketOnCloseTable,
    ),
    printOnDeletedItemsUpdate: parseBooleanValue(
      printing.printOnDeletedItemsUpdate ?? settings.printOnDeletedItemsUpdate,
      DEFAULT_RESTAURANT_SETTINGS.printOnDeletedItemsUpdate,
    ),
    onlyOwnerCanCloseTable: parseBooleanValue(
      permissions.onlyOwnerCanCloseTable ?? settings.onlyOwnerCanCloseTable,
      DEFAULT_RESTAURANT_SETTINGS.onlyOwnerCanCloseTable,
    ),
    onlyOwnerCanDeleteOrderItems: parseBooleanValue(
      permissions.onlyOwnerCanDeleteOrderItems ?? settings.onlyOwnerCanDeleteOrderItems,
      DEFAULT_RESTAURANT_SETTINGS.onlyOwnerCanDeleteOrderItems,
    ),
    avoidDuplicateKitchenUpdatePrint: parseBooleanValue(
      printing.avoidDuplicateKitchenUpdatePrint ?? settings.avoidDuplicateKitchenUpdatePrint,
      DEFAULT_RESTAURANT_SETTINGS.avoidDuplicateKitchenUpdatePrint,
    ),
    extraSectionPrintDestinations: normalizeExtraSectionPrintDestinations(rawExtraSectionPrintDestinations),
    drawerPrinter: String(
      printing.drawerPrinter ?? settings.drawerPrinter ?? readStringFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerPrinter, DEFAULT_RESTAURANT_SETTINGS.drawerPrinter)
    ),
    drawerHotkey: String(
      printing.drawerHotkey ?? settings.drawerHotkey ?? readStringFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerHotkey, DEFAULT_RESTAURANT_SETTINGS.drawerHotkey)
    ),
    drawerOpenOnCloseOrder: parseBooleanValue(
      printing.drawerOpenOnCloseOrder ?? settings.drawerOpenOnCloseOrder ?? readBooleanFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerOpenOnCloseOrder, DEFAULT_RESTAURANT_SETTINGS.drawerOpenOnCloseOrder),
      DEFAULT_RESTAURANT_SETTINGS.drawerOpenOnCloseOrder,
    ),
    drawerAlwaysOpen: parseBooleanValue(
      printing.drawerAlwaysOpen ?? settings.drawerAlwaysOpen,
      DEFAULT_RESTAURANT_SETTINGS.drawerAlwaysOpen,
    ),
    drawerConfigOwnerOnly: parseBooleanValue(
      permissions.drawerConfigOwnerOnly ?? settings.drawerConfigOwnerOnly,
      DEFAULT_RESTAURANT_SETTINGS.drawerConfigOwnerOnly,
    ),
  };
};

const getRestaurantSettingsFromStorage = () => ({
  updatePrintMode: readStringFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.updatePrintMode,
    DEFAULT_RESTAURANT_SETTINGS.updatePrintMode,
  ) === 'new-only'
    ? 'new-only'
    : 'all',
  reprintTicketOnCloseTable: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.reprintTicketOnCloseTable,
    DEFAULT_RESTAURANT_SETTINGS.reprintTicketOnCloseTable,
  ),
  printOnDeletedItemsUpdate: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.printOnDeletedItemsUpdate,
    DEFAULT_RESTAURANT_SETTINGS.printOnDeletedItemsUpdate,
  ),
  onlyOwnerCanCloseTable: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.onlyOwnerCanCloseTable,
    DEFAULT_RESTAURANT_SETTINGS.onlyOwnerCanCloseTable,
  ),
  onlyOwnerCanDeleteOrderItems: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.onlyOwnerCanDeleteOrderItems,
    DEFAULT_RESTAURANT_SETTINGS.onlyOwnerCanDeleteOrderItems,
  ),
  avoidDuplicateKitchenUpdatePrint: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.avoidDuplicateKitchenUpdatePrint,
    DEFAULT_RESTAURANT_SETTINGS.avoidDuplicateKitchenUpdatePrint,
  ),
  extraSectionPrintDestinations: normalizeExtraSectionPrintDestinations(
    readJsonFromStorage(
      RESTAURANT_SETTINGS_STORAGE_KEYS.extraSectionPrintDestinations,
      DEFAULT_RESTAURANT_SETTINGS.extraSectionPrintDestinations,
    ),
  ),
  drawerPrinter: readStringFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.drawerPrinter,
    DEFAULT_RESTAURANT_SETTINGS.drawerPrinter,
  ),
  drawerAlwaysOpen: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.drawerAlwaysOpen,
    DEFAULT_RESTAURANT_SETTINGS.drawerAlwaysOpen,
  ),
  drawerConfigOwnerOnly: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.drawerConfigOwnerOnly,
    DEFAULT_RESTAURANT_SETTINGS.drawerConfigOwnerOnly,
  ),
  drawerHotkey: readStringFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.drawerHotkey,
    DEFAULT_RESTAURANT_SETTINGS.drawerHotkey,
  ),
  drawerOpenOnCloseOrder: readBooleanFromStorage(
    RESTAURANT_SETTINGS_STORAGE_KEYS.drawerOpenOnCloseOrder,
    DEFAULT_RESTAURANT_SETTINGS.drawerOpenOnCloseOrder,
  ),
});

const getRestaurantSettingsSnapshot = () => {
  if (!restaurantSettingsCache) {
    restaurantSettingsCache = getRestaurantSettingsFromStorage();
  }
  return { ...restaurantSettingsCache };
};

const applyRestaurantSettingsLocally = (settings = {}) => {
  const normalized = normalizeRestaurantSettings(settings);
  restaurantSettingsCache = normalized;

  try {
    localStorage.setItem(RESTAURANT_SETTINGS_STORAGE_KEYS.updatePrintMode, normalized.updatePrintMode);
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.reprintTicketOnCloseTable,
      String(Boolean(normalized.reprintTicketOnCloseTable)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.printOnDeletedItemsUpdate,
      String(Boolean(normalized.printOnDeletedItemsUpdate)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.onlyOwnerCanCloseTable,
      String(Boolean(normalized.onlyOwnerCanCloseTable)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.onlyOwnerCanDeleteOrderItems,
      String(Boolean(normalized.onlyOwnerCanDeleteOrderItems)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.avoidDuplicateKitchenUpdatePrint,
      String(Boolean(normalized.avoidDuplicateKitchenUpdatePrint)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.extraSectionPrintDestinations,
      JSON.stringify(normalized.extraSectionPrintDestinations || {}),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.drawerPrinter,
      String(normalized.drawerPrinter || ''),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.drawerOpenOnCloseOrder,
      String(Boolean(normalized.drawerOpenOnCloseOrder)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.drawerAlwaysOpen,
      String(Boolean(normalized.drawerAlwaysOpen)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.drawerConfigOwnerOnly,
      String(Boolean(normalized.drawerConfigOwnerOnly)),
    );
    localStorage.setItem(
      RESTAURANT_SETTINGS_STORAGE_KEYS.drawerHotkey,
      String(normalized.drawerHotkey || ''),
    );
  } catch {
    // No-op si localStorage no está disponible
  }

  return normalized;
};

const buildRestaurantSettingsPayload = (settings = {}) => {
  const normalized = normalizeRestaurantSettings(settings);
  return {
    printing: {
      updatePrintMode: normalized.updatePrintMode,
      reprintTicketOnCloseTable: normalized.reprintTicketOnCloseTable,
      printOnDeletedItemsUpdate: normalized.printOnDeletedItemsUpdate,
      avoidDuplicateKitchenUpdatePrint: normalized.avoidDuplicateKitchenUpdatePrint,
      extraSectionPrintDestinations: normalized.extraSectionPrintDestinations,
      drawerPrinter: normalized.drawerPrinter,
      drawerAlwaysOpen: normalized.drawerAlwaysOpen,
      drawerHotkey: normalized.drawerHotkey,
      drawerOpenOnCloseOrder: normalized.drawerOpenOnCloseOrder,
    },
    permissions: {
      onlyOwnerCanCloseTable: normalized.onlyOwnerCanCloseTable,
      onlyOwnerCanDeleteOrderItems: normalized.onlyOwnerCanDeleteOrderItems,
      drawerConfigOwnerOnly: normalized.drawerConfigOwnerOnly,
    },
  };
};

// Funcion auxiliar para normalizar texto y eliminar caracteres especiales
const normalizeText = (text) => {
  if (!text) return text;
  return text
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U');
};

const getOrderedExtraSectionNames = (extrasBySection = {}, sectionDefinitions = []) => {
  const availableSections = Object.keys(extrasBySection || {});
  if (availableSections.length <= 1) {
    return availableSections;
  }

  const preferredSectionOrder = (Array.isArray(sectionDefinitions) ? sectionDefinitions : [])
    .map((section) => (typeof section?.sectionName === 'string' ? section.sectionName.trim() : ''))
    .filter((sectionName) => Boolean(sectionName));

  if (preferredSectionOrder.length === 0) {
    return availableSections;
  }

  const preferredSet = new Set(preferredSectionOrder);
  return [
    ...preferredSectionOrder.filter((sectionName) => Object.prototype.hasOwnProperty.call(extrasBySection, sectionName)),
    ...availableSections.filter((sectionName) => !preferredSet.has(sectionName)),
  ];
};

const normalizePrintItemsForSignature = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const foodId = item?.food?._id || item?.food || item?.id || '';
      const foodName = item?.name || item?.food?.title || item?.food?.name || '';
      const quantity = Number(item?.quantity || 0);
      const comment = item?.comment || '';
      const extras = Array.isArray(item?.selectedExtras)
        ? item.selectedExtras
            .map((extra) => ({
              sectionName: extra?.sectionName || '',
              extraName: extra?.extraName || '',
              price: Number(extra?.price || 0),
            }))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : [];

      return {
        foodId: String(foodId),
        foodName: String(foodName),
        quantity,
        comment: String(comment),
        extras,
      };
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
};

const getSinglePrintItemSignature = (item = {}) => {
  const [normalizedItem] = normalizePrintItemsForSignature([item]);
  return JSON.stringify(normalizedItem || {});
};

// Servicio de impresion
export const printingService = {
  // Verificar el estado del servicio de impresion
  async checkHealth() {
    try {
      const response = await printingApi.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error checking printing service health:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Servicio de impresion no disponible'
      };
    }
  },

  // Obtener lista de impresoras disponibles
  async getPrinters() {
    try {
      const response = await printingApi.get('/printers');
      // El servicio devuelve { printers: [...] }, necesitamos extraer el array
      const printers = response.data.printers || [];
      return {
        success: true,
        data: printers
      };
    } catch (error) {
      console.error('Error getting printers:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener impresoras'
      };
    }
  },

  // Imprimir contenido
  async print(printerName, content, copies = 1, isKitchen = false) {
    try {
      const response = await printingApi.post('/print', {
        printerName,
        content,
        copies,
        isKitchen
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error printing:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Error al imprimir'
      };
    }
  },

  // Imprimir pagina de prueba
  async printTest(printerName) {
    const testContent = `
================================
        PAGINA DE PRUEBA
================================

Fecha: ${new Date().toLocaleString()}
Impresora: ${printerName}

Esta es una pagina de prueba para
verificar que la impresora esta
funcionando correctamente.

================================
    Gestion Restaurante
================================




    `;

    return this.print(printerName, testContent.trim(), 1);
  },

  // Imprimir prueba de fuente (verifica tamaño y negrita)
  async printFontTest(printerName) {
    const settings = this.getLocalFontSettings();
    const modeName = settings.bold ? 'Grande' : 'NORMAL';
    const testContent = `
================================
         PRUEBA DE FUENTE
================================

Modo activo: ${modeName}
Fecha: ${new Date().toLocaleString()}

================================
           PRODUCTOS
================================

[BOLD]1x Producto nombre largo
   Nota: sin cebolla

2x Otro producto largo aqui
3x Bebida
[/BOLD]
================================

Si los PRODUCTOS se ven en negrita
y el encabezado en normal,
la fuente esta configurada bien.

================================



    `;
    return this.print(printerName, testContent.trim(), 1, true); // isKitchen=true para probar negrita
  },

  // Obtener impresora predeterminada
  getDefaultPrinter() {
    return localStorage.getItem('defaultPrinter') || null;
  },

  // Establecer impresora predeterminada
  setDefaultPrinter(printerName) {
    localStorage.setItem('defaultPrinter', printerName);
  },

  // Remover impresora predeterminada
  removeDefaultPrinter() {
    localStorage.removeItem('defaultPrinter');
  },

  // Imprimir con impresora predeterminada
  async printWithDefault(content, copies = 1, isKitchen = false) {
    const defaultPrinter = this.getDefaultPrinter();
    if (!defaultPrinter) {
      return {
        success: false,
        error: 'No hay impresora predeterminada configurada'
      };
    }

    return this.print(defaultPrinter, content, copies, isKitchen);
  },

  // Obtener configuracion de fuente del servicio C#
  async getSettings() {
    try {
      const response = await printingApi.get('/settings');
      // Conservar opciones locales extendidas que el servicio C# no conoce
      const localSettings = this.getLocalFontSettings();
      const mergedSettings = normalizeLocalFontSettings({
        ...response.data,
        kitchenHeaderBold: localSettings.kitchenHeaderBold,
      });

      localStorage.setItem('printFontSettings', JSON.stringify(mergedSettings));
      return { success: true, data: mergedSettings };
    } catch (error) {
      // Fallback a localStorage si el servicio no esta disponible
      const local = this.getLocalFontSettings();
      return { success: false, data: local };
    }
  },

  // Guardar configuracion de fuente en el servicio C# y localStorage
  async saveSettings(settings) {
    try {
      const normalizedSettings = normalizeLocalFontSettings(settings);
      localStorage.setItem('printFontSettings', JSON.stringify(normalizedSettings));

      // Enviar solo llaves compatibles con el servicio C#
      const payload = {
        fontSize: normalizedSettings.fontSize,
        bold: normalizedSettings.bold,
      };

      const response = await printingApi.post('/settings', payload);
      return {
        success: true,
        data: {
          ...response.data,
          kitchenHeaderBold: normalizedSettings.kitchenHeaderBold,
        },
      };
    } catch (error) {
      console.error('Error saving font settings:', error);
      return { success: false, error: 'Error al guardar configuracion' };
    }
  },

  // Obtener configuracion de fuente desde localStorage (sincrono)
  getLocalFontSettings() {
    try {
      const saved = localStorage.getItem('printFontSettings');
      if (!saved) {
        return { ...DEFAULT_FONT_SETTINGS };
      }

      return normalizeLocalFontSettings(JSON.parse(saved));
    } catch {
      return { ...DEFAULT_FONT_SETTINGS };
    }
  },

  // Obtener modo de impresion de actualizaciones
  getUpdatePrintMode() {
    return getRestaurantSettingsSnapshot().updatePrintMode;
  },

  // Guardar modo de impresion de actualizaciones
  setUpdatePrintMode(mode) {
    const normalizedMode = mode === 'new-only' ? 'new-only' : 'all';
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      updatePrintMode: normalizedMode,
    });
  },

  // Obtener si se debe reimprimir ticket al cerrar mesa
  getReprintTicketOnCloseTable() {
    return getRestaurantSettingsSnapshot().reprintTicketOnCloseTable;
  },

  // Guardar preferencia de reimpresion de ticket al cerrar mesa
  setReprintTicketOnCloseTable(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      reprintTicketOnCloseTable: Boolean(enabled),
    });
  },

  // Obtener si se imprime actualizacion al eliminar productos
  getPrintOnDeletedItemsUpdate() {
    return getRestaurantSettingsSnapshot().printOnDeletedItemsUpdate;
  },

  // Guardar preferencia para imprimir actualizaciones con productos eliminados
  setPrintOnDeletedItemsUpdate(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      printOnDeletedItemsUpdate: Boolean(enabled),
    });
  },

  // Obtener si solo el dueño puede cerrar mesas
  getOnlyOwnerCanCloseTable() {
    return getRestaurantSettingsSnapshot().onlyOwnerCanCloseTable;
  },

  // Guardar preferencia para permitir cierre de mesa solo a owner
  setOnlyOwnerCanCloseTable(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      onlyOwnerCanCloseTable: Boolean(enabled),
    });
  },

  // Obtener si solo el dueño puede eliminar productos de una orden
  getOnlyOwnerCanDeleteOrderItems() {
    return getRestaurantSettingsSnapshot().onlyOwnerCanDeleteOrderItems;
  },

  // Guardar preferencia para permitir eliminación de productos solo a owner
  setOnlyOwnerCanDeleteOrderItems(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      onlyOwnerCanDeleteOrderItems: Boolean(enabled),
    });
  },

  // Verificar si el usuario actual puede eliminar productos de una orden
  canCurrentUserDeleteOrderItems() {
    const onlyOwnerCanDelete = this.getOnlyOwnerCanDeleteOrderItems();
    if (!onlyOwnerCanDelete) return true;

    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      return localUser?.role === 'owner' || localUser?.role === 'super_admin';
    } catch {
      return false;
    }
  },

  // Obtener si se evita reimprimir la misma comanda al actualizar/reenviar
  getAvoidDuplicateKitchenUpdatePrint() {
    return getRestaurantSettingsSnapshot().avoidDuplicateKitchenUpdatePrint;
  },

  // Guardar preferencia para evitar reimpresiones duplicadas de actualizaciones
  setAvoidDuplicateKitchenUpdatePrint(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      avoidDuplicateKitchenUpdatePrint: Boolean(enabled),
    });
  },

  // Obtener destinos de impresión por sección de extras
  getExtraSectionPrintDestinations() {
    return { ...getRestaurantSettingsSnapshot().extraSectionPrintDestinations };
  },

  // Obtener la impresora configurada para la caja
  getDrawerPrinter() {
    try {
      return localStorage.getItem(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerPrinter) || '';
    } catch {
      return '';
    }
  },

  // Obtener la tecla rápida configurada para abrir caja
  getDrawerHotkey() {
    try {
      return localStorage.getItem(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerHotkey) || '';
    } catch {
      return '';
    }
  },

  // Guardar la tecla rápida para abrir caja
  setDrawerHotkey(hotkey) {
    try {
      localStorage.setItem(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerHotkey, String(hotkey || ''));
    } catch {}
  },

  // Establecer la impresora para la caja
  setDrawerPrinter(printerName) {
    try {
      localStorage.setItem(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerPrinter, String(printerName || ''));
    } catch {}
  },

  // Obtener si la caja debe poder abrirse desde cualquier cuenta (global)
  getDrawerAlwaysOpen() {
    try {
      return readBooleanFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerAlwaysOpen, DEFAULT_RESTAURANT_SETTINGS.drawerAlwaysOpen);
    } catch {
      return DEFAULT_RESTAURANT_SETTINGS.drawerAlwaysOpen;
    }
  },

  // Guardar preferencia global de abrir caja desde cualquier cuenta
  setDrawerAlwaysOpen(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      drawerAlwaysOpen: Boolean(enabled),
    });
  },

  // Obtener si abrir la caja automaticamente al cerrar un pedido (un solo switch)
  getDrawerOpenOnCloseOrder() {
    try {
      return readBooleanFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerOpenOnCloseOrder, DEFAULT_RESTAURANT_SETTINGS.drawerOpenOnCloseOrder);
    } catch {
      return DEFAULT_RESTAURANT_SETTINGS.drawerOpenOnCloseOrder;
    }
  },

  // Guardar preferencia: abrir caja automaticamente al cerrar un pedido
  setDrawerOpenOnCloseOrder(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      drawerOpenOnCloseOrder: Boolean(enabled),
    });
  },

  // Obtener si la sección de configuracion de caja solo la ve el owner
  isDrawerConfigOwnerOnly() {
    try {
      return readBooleanFromStorage(RESTAURANT_SETTINGS_STORAGE_KEYS.drawerConfigOwnerOnly, DEFAULT_RESTAURANT_SETTINGS.drawerConfigOwnerOnly);
    } catch {
      return DEFAULT_RESTAURANT_SETTINGS.drawerConfigOwnerOnly;
    }
  },

  // Guardar visibilidad owner-only para la configuracion de caja
  setDrawerConfigOwnerOnly(enabled) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      drawerConfigOwnerOnly: Boolean(enabled),
    });
  },

  // Chequear si el usuario actual es owner o super_admin
  isCurrentUserOwner() {
    try {
      const userRaw = localStorage.getItem('user');
      if (!userRaw) return false;
      const user = JSON.parse(userRaw);
      return user?.role === 'owner' || user?.role === 'super_admin';
    } catch {
      return false;
    }
  },

  // Guardar destinos de impresión por sección de extras
  setExtraSectionPrintDestinations(extraSectionPrintDestinations = {}) {
    applyRestaurantSettingsLocally({
      ...getRestaurantSettingsSnapshot(),
      extraSectionPrintDestinations: normalizeExtraSectionPrintDestinations(extraSectionPrintDestinations),
    });
  },

  // Sincronizar configuración compartida desde backend hacia caché/localStorage
  async syncRestaurantSettingsFromBackend(force = false) {
    if (!force && restaurantSettingsSyncPromise) {
      return restaurantSettingsSyncPromise;
    }

    restaurantSettingsSyncPromise = (async () => {
      try {
        const response = await restaurantService.getMyRestaurantSettings();
        const normalized = applyRestaurantSettingsLocally(response?.settings || {});
        return { success: true, data: normalized };
      } catch (error) {
        return {
          success: false,
          data: getRestaurantSettingsSnapshot(),
          error: error.message || 'No se pudo sincronizar la configuración del restaurante',
        };
      } finally {
        restaurantSettingsSyncPromise = null;
      }
    })();

    return restaurantSettingsSyncPromise;
  },

  // Guardar configuración compartida en backend y sincronizar caché/localStorage
  async saveRestaurantSettingsToBackend(partialSettings = {}) {
    const nextSnapshot = {
      ...getRestaurantSettingsSnapshot(),
      ...partialSettings,
    };

    applyRestaurantSettingsLocally(nextSnapshot);

    try {
      const payload = buildRestaurantSettingsPayload(nextSnapshot);
      const response = await restaurantService.updateMyRestaurantSettings(payload);
      // Preserve locally-stored drawerHotkey if backend response doesn't include it
      const respSettings = response?.settings || payload || {};
      try {
        respSettings.printing = respSettings.printing || {};
        if (!respSettings.printing.hasOwnProperty('drawerHotkey') || respSettings.printing.drawerHotkey === '') {
          respSettings.printing.drawerHotkey = getRestaurantSettingsSnapshot().drawerHotkey || '';
        }
        if (!respSettings.printing.hasOwnProperty('drawerPrinter') || !respSettings.printing.drawerPrinter) {
          respSettings.printing.drawerPrinter = getRestaurantSettingsSnapshot().drawerPrinter || '';
        }
      } catch (e) {
        // ignore
      }

      const normalized = applyRestaurantSettingsLocally(respSettings);
      return { success: true, data: normalized };
    } catch (error) {
      return {
        success: false,
        data: getRestaurantSettingsSnapshot(),
        error: error.message || 'No se pudo guardar la configuración compartida',
      };
    }
  },

  // Limpiar caché en cambios de sesión/autenticación
  clearRestaurantSettingsCache() {
    restaurantSettingsCache = null;
    restaurantSettingsSyncPromise = null;
  },

  // Firma estable para detectar reenvíos idénticos en actualizaciones de cocina
  getKitchenUpdatePrintSignature(orderId, options = {}) {
    const payload = {
      orderId: String(orderId || ''),
      newFoods: normalizePrintItemsForSignature(options.newFoods || []),
      deletedFoods: normalizePrintItemsForSignature(options.deletedFoods || []),
      allFoods: normalizePrintItemsForSignature(options.allFoods || []),
    };
    return JSON.stringify(payload);
  },

  // Verifica si la actualización ya fue impresa antes (con opción habilitada)
  shouldSkipDuplicateKitchenUpdatePrint(orderId, options = {}) {
    if (!this.getAvoidDuplicateKitchenUpdatePrint()) return false;
    if (!orderId) return false;

    try {
      const key = `lastKitchenUpdatePrint:${orderId}`;
      const currentSignature = this.getKitchenUpdatePrintSignature(orderId, options);
      const previousSignature = localStorage.getItem(key);
      return Boolean(previousSignature && previousSignature === currentSignature);
    } catch {
      return false;
    }
  },

  // Guarda la última firma impresa de actualización
  markKitchenUpdatePrint(orderId, options = {}) {
    if (!orderId) return;
    try {
      const key = `lastKitchenUpdatePrint:${orderId}`;
      const signature = this.getKitchenUpdatePrintSignature(orderId, options);
      localStorage.setItem(key, signature);
    } catch {
      // No-op si localStorage no está disponible
    }
  },

  // Obtiene solo productos eliminados que aun no se han impreso para esta orden
  getUnprintedDeletedFoodsForOrder(orderId, deletedFoods = []) {
    if (!orderId || !Array.isArray(deletedFoods) || deletedFoods.length === 0) return [];

    try {
      const key = `printedDeletedFoods:${orderId}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const printedSet = new Set(Array.isArray(stored) ? stored : []);

      return deletedFoods.filter((item) => {
        const signature = getSinglePrintItemSignature(item);
        return !printedSet.has(signature);
      });
    } catch {
      return deletedFoods;
    }
  },

  // Marca productos eliminados como ya impresos para evitar reimpresiones
  markDeletedFoodsPrintedForOrder(orderId, deletedFoods = []) {
    if (!orderId || !Array.isArray(deletedFoods) || deletedFoods.length === 0) return;

    try {
      const key = `printedDeletedFoods:${orderId}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const printedSet = new Set(Array.isArray(stored) ? stored : []);

      deletedFoods.forEach((item) => {
        printedSet.add(getSinglePrintItemSignature(item));
      });

      localStorage.setItem(key, JSON.stringify(Array.from(printedSet)));
    } catch {
      // No-op si localStorage no está disponible
    }
  },

  // Generar comanda de cancelacion (solo productos eliminados)
  generateKitchenCancellationOrder(order, deletedFoods = []) {
    const date = new Date();
    const orderNumber = order.orderNumber || order.id || order._id || 'N/A';

    let customer = 'Cliente';
    if (order.buyer && typeof order.buyer === 'object' && order.buyer.name) {
      customer = normalizeText(order.buyer.name || order.name);
    } else if (order.name) {
      customer = normalizeText(order.name);
    } else if (order.customer_name) {
      customer = normalizeText(order.customer_name);
    } else if (order.customerName) {
      customer = normalizeText(order.customerName);
    }

    const orderType = order.section || order.order_type || order.orderType || 'Mostrador';
    const isMesas = orderType.toLowerCase() === 'mesas';

    const tableNumber = order.tableNumber || '';
    let waiterName = '';
    if (order.waiter && typeof order.waiter === 'object') {
      waiterName = normalizeText(order.waiter.userName || order.waiter.name || '');
    } else if (order.waiterName) {
      waiterName = normalizeText(order.waiterName);
    }

    let content = `
================================
    *** CANCELACION PEDIDO ***
================================

No. Orden: #${orderNumber}
`;

    if (isMesas) {
      if (tableNumber) content += `Mesa: ${tableNumber}\n`;
      if (waiterName) content += `Garzon: ${waiterName}\n`;
    } else {
      content += `Cliente: ${customer}\n`;
      content += `Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}\n`;
    }

    content += `Hora: ${date.toLocaleTimeString()}
`;

    content += `
================================
     PRODUCTOS CANCELADOS
================================

[BOLD]`;

    deletedFoods.forEach((item) => {
      const deletedName = normalizeText(item.name || item.food?.title || item.food?.name || 'Producto');
      const deletedQty = item.quantity || 1;
      content += `- ${deletedQty}x ${deletedName}\n`;

      if (item.selectedExtras && Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0) {
        const extrasBySection = {};
        item.selectedExtras.forEach(extra => {
          const section = extra.sectionName || 'Extras';
          if (!extrasBySection[section]) {
            extrasBySection[section] = [];
          }
          extrasBySection[section].push(extra);
        });

        const sectionDefinitions = Array.isArray(item?.food?.extraSections)
          ? item.food.extraSections
          : (Array.isArray(item?.extraSections) ? item.extraSections : []);

        getOrderedExtraSectionNames(extrasBySection, sectionDefinitions).forEach(sectionName => {
          const normalizedSection = normalizeText(sectionName);
          content += `   ${normalizedSection}:\n`;

          const groupedExtras = {};
          extrasBySection[sectionName].forEach(extra => {
            const normalizedExtraName = normalizeText(extra.extraName || 'Extra');
            const key = normalizedExtraName;
            if (!groupedExtras[key]) {
              groupedExtras[key] = { name: normalizedExtraName, count: 0 };
            }
            groupedExtras[key].count += 1;
          });

          Object.values(groupedExtras).forEach(extraGroup => {
            const prefix = extraGroup.count > 1 ? `${extraGroup.count}x ` : '';
            content += `     - ${prefix}${extraGroup.name}\n`;
          });
        });
      }

      const deletedComment = item.comment || '';
      if (deletedComment.trim()) {
        const normalizedNotes = normalizeText(deletedComment);
        const noteLines = normalizedNotes.trim().split('\n');
        noteLines.forEach((line, index) => {
          if (index === 0) {
            content += `   Nota: ${line}\n`;
          } else {
            content += `         ${line}\n`;
          }
        });
      }

      content += '\n';
    });

    content += `[/BOLD]\n================================`;
    return content.trim();
  },

  /**
   * Resolve multi-printer targets with extra-section priority.
   * Priority rules:
   * 1) Product base uses category printDestinations.
   * 2) Extras use extra-section destinations when configured.
   * 3) Extras without section config inherit product/category destinations.
   * 4) If extra and product share printer, extras stay with product line.
   * 5) If extra targets a different printer, it is printed as "extras para <producto>".
   */
  resolveOrderPrintersWithExtras(orderItems, categories = []) {
    const printerRoles = printerConfigService.getPrinterRoles();
    if (Object.keys(printerRoles).length === 0) {
      return [];
    }

    const availableRoles = printerConfigService.getAvailableRoles();
    const categoryDestinations = {};
    categories.forEach(cat => {
      const id = String(cat._id || cat.id || '');
      if (!id || !Array.isArray(cat.printDestinations)) {
        return;
      }

      const validRoles = cat.printDestinations.filter(role => availableRoles.includes(role));
      if (validRoles.length > 0) {
        categoryDestinations[id] = validRoles;
      }
    });

    const extraSectionPrintDestinations = this.getExtraSectionPrintDestinations();
    const fallbackRole = availableRoles.find(role => printerRoles[role]);
    const fallbackPrinter = fallbackRole ? printerRoles[fallbackRole] : null;
    const printerMap = {};

    const ensurePrinterTarget = (printerName) => {
      if (!printerMap[printerName]) {
        printerMap[printerName] = { items: [], roles: new Set() };
      }
      return printerMap[printerName];
    };

    const resolveDestinations = (roles = []) => {
      const resolvedPrinters = new Set();
      const resolvedRoles = new Set();

      (Array.isArray(roles) ? roles : []).forEach(role => {
        if (!availableRoles.includes(role)) {
          return;
        }

        const printerName = printerRoles[role];
        if (!printerName) {
          return;
        }

        resolvedPrinters.add(printerName);
        resolvedRoles.add(role);
      });

      if (resolvedPrinters.size === 0 && fallbackPrinter) {
        resolvedPrinters.add(fallbackPrinter);
        if (fallbackRole) {
          resolvedRoles.add(fallbackRole);
        }
      }

      return {
        printers: Array.from(resolvedPrinters),
        roles: Array.from(resolvedRoles),
      };
    };

    orderItems.forEach(item => {
      const food = item.food || item;
      const categoryId = food?.category
        ? (typeof food.category === 'object' ? (food.category._id || food.category.id) : food.category)
        : null;

      const categoryRoles = categoryId ? (categoryDestinations[String(categoryId)] || []) : [];
      const productTargets = resolveDestinations(categoryRoles);
      const selectedExtras = Array.isArray(item?.selectedExtras) ? item.selectedExtras : [];
      const extrasByPrinter = {};
      const rolesByPrinter = {};

      productTargets.printers.forEach(printerName => {
        if (!rolesByPrinter[printerName]) {
          rolesByPrinter[printerName] = new Set();
        }
        productTargets.roles.forEach(role => rolesByPrinter[printerName].add(role));
      });

      selectedExtras.forEach(extra => {
        const sectionName = typeof extra?.sectionName === 'string' ? extra.sectionName.trim() : '';
        const sectionRoles = sectionName && Array.isArray(extraSectionPrintDestinations[sectionName])
          ? extraSectionPrintDestinations[sectionName]
          : [];

        const rolesForExtra = sectionRoles.length > 0 ? sectionRoles : categoryRoles;
        const extraTargets = resolveDestinations(rolesForExtra);

        extraTargets.printers.forEach(printerName => {
          if (!extrasByPrinter[printerName]) {
            extrasByPrinter[printerName] = [];
          }
          extrasByPrinter[printerName].push(extra);

          if (!rolesByPrinter[printerName]) {
            rolesByPrinter[printerName] = new Set();
          }
          extraTargets.roles.forEach(role => rolesByPrinter[printerName].add(role));
        });
      });

      productTargets.printers.forEach(printerName => {
        const target = ensurePrinterTarget(printerName);
        (rolesByPrinter[printerName] || []).forEach(role => target.roles.add(role));

        target.items.push({
          ...item,
          selectedExtras: extrasByPrinter[printerName] || [],
        });

        delete extrasByPrinter[printerName];
      });

      Object.entries(extrasByPrinter).forEach(([printerName, remoteExtras]) => {
        const target = ensurePrinterTarget(printerName);
        (rolesByPrinter[printerName] || []).forEach(role => target.roles.add(role));

        target.items.push({
          ...item,
          selectedExtras: remoteExtras,
          _remoteExtraOnly: true,
          _remoteProductName: food?.title || food?.name || item?.name || 'Producto',
          _remoteProductQuantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
        });
      });
    });

    return Object.entries(printerMap).map(([printerName, data]) => ({
      printerName,
      items: data.items,
      roles: Array.from(data.roles),
    }));
  },

  // Generar comanda de cocina
  generateKitchenOrder(order, options = {}) {

    const date = new Date();
    const orderNumber = order.orderNumber || order.id || order._id || 'N/A';
    const kitchenHeaderBold = Boolean(this.getLocalFontSettings().kitchenHeaderBold);

    // Extraer nombre del cliente desde diferentes posibles campos
    let customer = 'Cliente';
    if (order.buyer && typeof order.buyer === 'object' && order.buyer.name) {
      // Cliente populated desde la base de datos
      customer = normalizeText(order.buyer.name || order.name);
    } else if (order.name) {
      // Cliente sin guardar (campo name directamente en el pedido)
      customer = normalizeText(order.name);
    } else if (order.customer_name) {
      // Formato alternativo
      customer = normalizeText(order.customer_name);
    } else if (order.customerName) {
      // Formato alternativo
      customer = normalizeText(order.customerName);
    }

    const orderType = order.section || order.order_type || order.orderType || 'Mostrador';
    const isMesas = orderType.toLowerCase() === 'mesas';

    // Extraer datos de mesa y garzón para sección mesas
    const tableNumber = order.tableNumber || '';
    let waiterName = '';
    if (order.waiter && typeof order.waiter === 'object') {
      waiterName = normalizeText(order.waiter.userName || order.waiter.name || '');
    } else if (order.waiterName) {
      waiterName = normalizeText(order.waiterName);
    }

    const isUpdate = (options.newFoods && options.newFoods.length > 0) ||
                     (options.deletedFoods && options.deletedFoods.length > 0);

    const headerDetailLines = [`No. Orden: #${orderNumber}`];
    if (isMesas) {
      if (tableNumber) headerDetailLines.push(`Mesa: ${tableNumber}`);
      if (waiterName) headerDetailLines.push(`Garzon: ${waiterName}`);
    } else {
      headerDetailLines.push(`Cliente: ${customer}`);
      headerDetailLines.push(`Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}`);
    }
    headerDetailLines.push(`Hora: ${date.toLocaleTimeString()}`);

    const headerDetailsText = `${headerDetailLines.join('\n')}\n`;
    const headerDetailsBlock = kitchenHeaderBold
      ? `[BOLD]${headerDetailsText}[/BOLD]\n`
      : headerDetailsText;

    let content;
    if (isUpdate) {
      content = `
================================
   *** ACTUALIZACION PEDIDO ***
================================

`;
      content += headerDetailsBlock;
    } else {
      content = `
================================
         COMANDA COCINA
================================

`;
      content += headerDetailsBlock;
    }

    // Agregar notas generales del pedido si existen (antes de productos)
    const orderNotes = normalizeText(order.comment || order.notes || '');
    if (orderNotes && orderNotes.trim()) {
      // Manejar notas generales con saltos de linea
      const noteLines = orderNotes.trim().split('\n');
      const commentLines = ['COMENTARIO GENERAL:', ...noteLines];
      const commentBlockText = `${commentLines.join('\n')}\n`;
      content += kitchenHeaderBold
        ? `[BOLD]${commentBlockText}[/BOLD]\n`
        : commentBlockText;
    }

    content += `
================================
           PRODUCTOS
================================

`;

    // Agregar productos - manejar diferentes estructuras
    let items = [];

    // Si se pasó allFoods con flags isNew ya calculados (update desde editCart), usarlo directamente
    if (options.allFoods && options.allFoods.length > 0) {
      items = options.allFoods.map(item => ({
        product_name: item.name || 'Producto',
        quantity: item.quantity || 1,
        notes: item.comment || '',
        selectedExtras: item.selectedExtras || [],
        extraSections: item.food?.extraSections || item.extraSections || [],
        isNew: item.isNew || false,
        isRemoteExtraOnly: false,
        remoteProductName: '',
        remoteProductQuantity: item.quantity || 1,
      }));
    }
    // Estructura del backend: order.foods
    else if (order.foods && Array.isArray(order.foods)) {
      items = order.foods.map(item => ({
        product_name: item.food?.title || item.food?.name || 'Producto',
        product_id: item.food?._id || item.food,
        quantity: item.quantity || 1,
        notes: item.comment || '',
        selectedExtras: item.selectedExtras || [],
        extraSections: item.food?.extraSections || item.extraSections || [],
        isNew: Boolean(item._isNew),
        isRemoteExtraOnly: Boolean(item._remoteExtraOnly),
        remoteProductName: item._remoteProductName || item.food?.title || item.food?.name || 'Producto',
        remoteProductQuantity: item._remoteProductQuantity || item.quantity || 1,
      }));

      // Si hay newFoods, marcar los productos nuevos usando matching inteligente
      if (options.newFoods && options.newFoods.length > 0) {
        // Crear lista de newFoods para matching (por ID y cantidad)
        const newFoodsToMatch = options.newFoods.map(nf => ({
          id: nf.food?._id || nf.food,
          name: nf.name || nf.food?.title || nf.food?.name || '',
          quantity: nf.quantity || 1,
          matched: false
        }));

        // Recorrer items de atrás hacia adelante (los nuevos suelen estar al final)
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          // Buscar un newFood que coincida y no haya sido usado
          const matchIndex = newFoodsToMatch.findIndex(nf =>
            !nf.matched &&
            (nf.id === item.product_id || nf.name === item.product_name) &&
            nf.quantity === item.quantity
          );

          if (matchIndex !== -1) {
            items[i].isNew = true;
            newFoodsToMatch[matchIndex].matched = true;
          }
        }
      }
    }
    // Estructura alternativa: order.items
    else if (order.items && Array.isArray(order.items)) {
      items = order.items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || '',
        selectedExtras: item.selectedExtras || [],
        extraSections: item.food?.extraSections || item.extraSections || [],
        isNew: false,
        isRemoteExtraOnly: false,
        remoteProductName: '',
        remoteProductQuantity: item.quantity || 1,
      }));
    }
    // Estructura alternativa: order.order_items
    else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || '',
        selectedExtras: item.selectedExtras || [],
        extraSections: item.food?.extraSections || item.extraSections || [],
        isNew: false,
        isRemoteExtraOnly: false,
        remoteProductName: '',
        remoteProductQuantity: item.quantity || 1,
      }));
    }

    // Si es una actualización (update), verificar el modo de impresión configurado
    if (isUpdate && options.newFoods && options.newFoods.length > 0) {
      const updateMode = options.forceNewOnly ? 'new-only' : this.getUpdatePrintMode();
      // Solo filtrar productos nuevos si el modo es 'new-only'
      if (updateMode === 'new-only') {
        items = items.filter(item => item.isNew === true);
      }
      // Si es 'all', se imprimen todos los productos (con asterisco en los nuevos)
    }

    // Agregar cada producto al contenido (marcado para negrita si esta configurado)
    content += `[BOLD]`;

    const appendGroupedExtras = (extras = [], sectionDefinitions = []) => {
      const extrasBySection = {};
      extras.forEach(extra => {
        const section = extra.sectionName || 'Extras';
        if (!extrasBySection[section]) {
          extrasBySection[section] = [];
        }
        extrasBySection[section].push(extra);
      });

      getOrderedExtraSectionNames(extrasBySection, sectionDefinitions).forEach(sectionName => {
        const normalizedSection = normalizeText(sectionName);
        content += `   ${normalizedSection}:\n`;

        const groupedExtras = {};
        extrasBySection[sectionName].forEach(extra => {
          const normalizedExtraName = normalizeText(extra.extraName || 'Extra');
          const key = normalizedExtraName;
          if (!groupedExtras[key]) {
            groupedExtras[key] = { name: normalizedExtraName, count: 0 };
          }
          groupedExtras[key].count += 1;
        });

        Object.values(groupedExtras).forEach(extraGroup => {
          const prefix = extraGroup.count > 1 ? `${extraGroup.count}x ` : '';
          content += `     - ${prefix}${extraGroup.name}\n`;
        });
      });
    };

    items.forEach(item => {
      if (item.isRemoteExtraOnly) {
        const remoteProductName = normalizeText(item.remoteProductName || item.product_name || 'Producto');
        const remoteQty = Number(item.remoteProductQuantity || item.quantity || 1);
        content += `${item.isNew ? '* ' : ''}${remoteQty}x Extras para ${remoteProductName}\n`;

        if (item.selectedExtras && Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0) {
          appendGroupedExtras(item.selectedExtras, item.extraSections || []);
        }

        content += '\n';
        return;
      }

      // Normalizar nombre del producto para eliminar caracteres especiales
      const normalizedProductName = normalizeText(item.product_name);
      content += `${item.isNew ? '* ' : ''}${item.quantity}x ${normalizedProductName}\n`;
      
      // Agregar extras si existen
      if (item.selectedExtras && Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0) {
        appendGroupedExtras(item.selectedExtras, item.extraSections || []);
      }
      
      if (item.notes && item.notes.trim()) {
        // Normalizar notas del producto
        const normalizedNotes = normalizeText(item.notes);
        // Manejar comentarios con saltos de linea
        const noteLines = normalizedNotes.trim().split('\n');
        noteLines.forEach((line, index) => {
          if (index === 0) {
            content += `   Nota: ${line}\n`;
          } else {
            content += `         ${line}\n`;
          }
        });
      }
      content += '\n';
    });
    content += `[/BOLD]`;

    content += `\n================================`;

    return content.trim();
  },

  /**
   * Generate kitchen order content for a SUBSET of items (for multi-printer routing).
   * IMPORTANT: strips allFoods/newFoods from options so generateKitchenOrder uses the
   * filtered order.foods instead of overriding with the full allFoods list.
   * @param {Object} order - original order
   * @param {Array} filteredItems - only the items destined for this printer
   * @param {Object} options - original options (allFoods will be stripped)
   * @param {string[]} roles - roles this printer handles (e.g. ['barra'])
   */
  generateKitchenOrderForItems(order, filteredItems, options = {}, roles = []) {
    // Build a filtered order with only the items for this printer
    const filteredOrder = {
      ...order,
      foods: filteredItems,
    };

    // Build a Set of food IDs in the filtered set for quick lookup
    const filteredFoodIds = new Set(
      filteredItems.map(item => item.food?._id || item.food).filter(Boolean)
    );

    // Strip allFoods — its presence in options would make generateKitchenOrder
    // ignore filteredOrder.foods and render ALL items instead.
    // Also filter newFoods to only include items going to this printer,
    // so the "* New" asterisk markers work correctly per ticket.
    const filteredOptions = {
      ...options,
      allFoods: null,
      newFoods: options.newFoods
        ? options.newFoods.filter(nf => {
            const id = nf.food?._id || nf.food;
            return id && filteredFoodIds.has(id);
          })
        : [],
    };

    return this.generateKitchenOrder(filteredOrder, filteredOptions);
  },

  /**
   * Print kitchen order with multi-printer routing.
   * Resolves which printers should receive items based on category printDestinations
   * and the local role→printer mapping.
   *
   * @param {Object} order - order data with foods array
   * @param {Object} options - { newFoods, deletedFoods, allFoods, categories }
   *   categories: array of category objects with _id and printDestinations
   * @returns {Object} { success, data/error, details[] }
   */
  async printKitchenOrderMulti(order, options = {}) {
    const { categories = [] } = options;
    const newFoods = Array.isArray(options.newFoods) ? options.newFoods : [];
    const isNewFoodsUpdate = newFoods.length > 0;

    // IMPORTANT: Always use order.foods for routing because it has populated category data.
    // options.allFoods may be present (update flow) but only has {food: id-string, name}
    // without category info — resolveOrderPrinters needs category IDs to route.
    const routingItems = order.foods || [];

    // Try multi-printer resolution using the populated order.foods
    const printerTargets = this.resolveOrderPrintersWithExtras(routingItems, categories);

    if (printerTargets.length === 0) {
      // No multi-printer config or no items resolved → fallback to single printer
      return this.printKitchenOrderSingle(order, options);
    }

    // Build a lookup of food ID → allFoods item (for isNew flags from cart),
    // so we can annotate filtered items with their isNew status for display
    const allFoodsById = {};
    if (options.allFoods && options.allFoods.length > 0) {
      options.allFoods.forEach(af => {
        const id = af.food?._id || af.food;
        if (id) allFoodsById[id] = af;
      });
    }

    // Send to each target printer with only its items
    const results = [];
    for (const target of printerTargets) {
      try {
        const targetFoodIds = new Set(
          target.items.map(item => item.food?._id || item.food).filter(Boolean)
        );

        const targetNewFoods = isNewFoodsUpdate
          ? newFoods.filter(nf => {
              const id = nf.food?._id || nf.food;
              return id && targetFoodIds.has(id);
            })
          : [];

        // En actualizaciones, evitar imprimir impresoras sin productos nuevos.
        if (isNewFoodsUpdate && targetNewFoods.length === 0) {
          continue;
        }

        // Annotate each item's food with isNew from allFoods if available
        const annotatedItems = target.items.map(item => {
          const foodId = item.food?._id || item.food;
          const allFoodsItem = foodId ? allFoodsById[foodId] : null;
          return allFoodsItem ? { ...item, _isNew: allFoodsItem.isNew || false } : item;
        });

        // Generate ticket with only the items for this printer
        // generateKitchenOrderForItems strips allFoods so it uses filtered items
        const content = this.generateKitchenOrderForItems(order, annotatedItems, {
          ...options,
          newFoods: targetNewFoods,
        }, target.roles);
        const result = await this.print(target.printerName, content, 1, true);
        results.push({ printerName: target.printerName, roles: target.roles, ...result });
      } catch (err) {
        console.error(`Error printing to ${target.printerName} (${target.roles.join('/')}):`, err);
        results.push({ printerName: target.printerName, roles: target.roles, success: false, error: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    return {
      success: allSuccess,
      data: results,
      error: allSuccess ? null : 'Algunos tickets no se pudieron imprimir',
      details: results,
    };
  },

  /**
   * Single-printer fallback for kitchen orders (original behavior)
   */
  async printKitchenOrderSingle(order, options = {}) {
    const content = this.generateKitchenOrder(order, options);
    return this.printWithDefault(content, 1, true);
  },

  // Imprimir comanda de cocina automaticamente (entry point)
  async printKitchenOrder(order, options = {}) {
    // If categories are provided and multi-printer config exists, use multi-printer
    if (options.categories && printerConfigService.hasMultiPrinterConfig()) {
      return this.printKitchenOrderMulti(order, options);
    }
    // Otherwise fallback to single printer
    return this.printKitchenOrderSingle(order, options);
  },

  // Imprimir ticket de cancelacion para productos eliminados
  async printKitchenCancellationOrder(order, options = {}) {
    const deletedFoods = Array.isArray(options.deletedFoods) ? options.deletedFoods : [];
    if (deletedFoods.length === 0) {
      return { success: false, error: 'No hay productos eliminados para imprimir' };
    }

    const content = this.generateKitchenCancellationOrder(order, deletedFoods);
    const defaultPrinter = this.getDefaultPrinter();

    if (defaultPrinter) {
      return this.print(defaultPrinter, content, 1, true);
    }

    if (printerConfigService.hasMultiPrinterConfig()) {
      const printerRoles = printerConfigService.getPrinterRoles();
      const uniquePrinters = [...new Set(Object.values(printerRoles).filter(Boolean))];

      if (uniquePrinters.length > 0) {
        const results = [];
        for (const printerName of uniquePrinters) {
          try {
            const result = await this.print(printerName, content, 1, true);
            results.push({ printerName, ...result });
          } catch (err) {
            results.push({ printerName, success: false, error: err.message });
          }
        }

        const allSuccess = results.every(r => r.success);
        return {
          success: allSuccess,
          data: results,
          error: allSuccess ? null : 'Algunas cancelaciones no se pudieron imprimir',
          details: results,
        };
      }
    }

    return this.printWithDefault(content, 1, true);
  },

  // Generar ticket de cliente
  generateCustomerTicket(order) {
    const splitAccountIndex = Number.isInteger(order?.printSplitAccountIndex)
      ? order.printSplitAccountIndex
      : null;
    const splitAccount = Array.isArray(order?.splitAccounts) && splitAccountIndex !== null
      ? order.splitAccounts[splitAccountIndex]
      : null;

    const ticketOrder = splitAccount
      ? {
          ...order,
          name: splitAccount.label || order.name,
          paymentMethods: splitAccount.paymentMethods || order.paymentMethods,
          tip: splitAccount.tip ?? order.tip,
          discount: splitAccount.discount ?? order.discount,
          foods: (splitAccount.items || []).map((item) => ({
            food: { title: item.name, price: item.unitPrice },
            quantity: item.quantity || 0,
            comment: '',
            selectedExtras: item.selectedExtras || [],
          })),
        }
      : order;

    const date = new Date();
    const orderNumber = ticketOrder.orderNumber || ticketOrder.id || ticketOrder._id || 'N/A';
    
    // Extraer nombre del cliente
    let customer = 'Cliente';
    if (ticketOrder.buyer && typeof ticketOrder.buyer === 'object' && ticketOrder.buyer.name) {
      customer = normalizeText(ticketOrder.buyer.name || ticketOrder.name);
    } else if (ticketOrder.name) {
      customer = normalizeText(ticketOrder.name);
    } else if (ticketOrder.customer_name) {
      customer = normalizeText(ticketOrder.customer_name);
    } else if (ticketOrder.customerName) {
      customer = normalizeText(ticketOrder.customerName);
    }

    // Extraer telefono del cliente
    let phone = '';
    if (ticketOrder.buyer && typeof ticketOrder.buyer === 'object' && ticketOrder.buyer.phone) {
      phone = ticketOrder.buyer.phone || ticketOrder.phone;
    } else if (ticketOrder.phone) {
      phone = ticketOrder.phone;
    } else if (ticketOrder.customer_phone) {
      phone = ticketOrder.customer_phone;
    } else if (ticketOrder.customerPhone) {
      phone = ticketOrder.customerPhone;
    }

    // Extraer datos de mesa y garzón cuando existan
    const tableNumber = ticketOrder.tableNumber || ticketOrder.table_number || ticketOrder.table || '';
    let waiterName = '';
    if (ticketOrder.waiter && typeof ticketOrder.waiter === 'object') {
      waiterName = normalizeText(ticketOrder.waiter.userName || ticketOrder.waiter.name || '');
    } else if (ticketOrder.waiterName) {
      waiterName = normalizeText(ticketOrder.waiterName);
    } else if (ticketOrder.waiter_name) {
      waiterName = normalizeText(ticketOrder.waiter_name);
    }

    // Extraer direccion (para todos los tipos de pedido)
    let address = '';
    if (ticketOrder.selectedAddress) {
      // selectedAddress puede ser string o objeto
      if (typeof ticketOrder.selectedAddress === 'string') {
        address = normalizeText(ticketOrder.selectedAddress);
      } else if (typeof ticketOrder.selectedAddress === 'object') {
        const addr = ticketOrder.selectedAddress;
        address = normalizeText(`${addr.street || ''} ${addr.number || ''}, ${addr.neighborhood || ''}`.trim());
        if (addr.reference) {
          address += `\nRef: ${normalizeText(addr.reference)}`;
        }
      }
    } else if (ticketOrder.address && typeof ticketOrder.address === 'object') {
      const addr = ticketOrder.address;
      address = normalizeText(`${addr.street || ''} ${addr.number || ''}, ${addr.neighborhood || ''}`.trim());
      if (addr.reference) {
        address += `\nRef: ${normalizeText(addr.reference)}`;
      }
    } else if (ticketOrder.address_text) {
      address = normalizeText(ticketOrder.address_text);
    } else if (ticketOrder.addressText) {
      address = normalizeText(ticketOrder.addressText);
    }

    let content = `
================================
        TICKET CLIENTE
================================

No. Orden: #${orderNumber}
Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
Cliente: ${customer}`;

    if (tableNumber) {
      content += `\nMesa: ${tableNumber}`;
    }

    if (waiterName) {
      content += `\nGarzon: ${waiterName}`;
    }

    if (phone) {
      content += `\nTelefono: ${phone}`;
    }

    if (address) {
      content += `\nDireccion: ${address}`;
    }

    // Agregar metodo de pago
    // Usar solo paymentMethods
    let paymentMethod = 'No especificado';
    if (Array.isArray(ticketOrder.paymentMethods) && ticketOrder.paymentMethods.length > 0) {
      paymentMethod = ticketOrder.paymentMethods.map(pm => {
        const method = normalizeText(pm.method || pm.name || 'Metodo');
        const amount = pm.amount ? `(${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(pm.amount)})` : '';
        return `${method} ${amount}`.trim();
      }).join(' + ');
    }
    content += `\nMetodo de pago: ${paymentMethod}`;

    // Agregar comentarios generales si existen
    const orderNotes = normalizeText(ticketOrder.comment || ticketOrder.notes || '');
    if (orderNotes && orderNotes.trim()) {
      content += `\nComentarios: ${orderNotes.trim()}`;
    }

    content += `

================================
           PRODUCTOS
================================

`;

    // Agregar productos y calcular total
    let items = [];
    let subtotal = 0;
    
    if (ticketOrder.foods && Array.isArray(ticketOrder.foods)) {
      items = ticketOrder.foods.map(item => ({
        product_name: item.food?.title || item.food?.name || 'Producto',
        quantity: item.quantity || 1,
        price: item.food?.price || 0,
        notes: item.comment || '',
        selectedExtras: item.selectedExtras || []
      }));
    } else if (ticketOrder.items && Array.isArray(ticketOrder.items)) {
      items = ticketOrder.items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || item.comment || '',
        selectedExtras: item.selectedExtras || []
      }));
    } else if (ticketOrder.order_items && Array.isArray(ticketOrder.order_items)) {
      items = ticketOrder.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || item.comment || '',
        selectedExtras: item.selectedExtras || []
      }));
    }

    // Agregar cada producto al contenido
    items.forEach(item => {
      // Calcular precio de extras
      const extrasTotal = (item.selectedExtras || []).reduce((sum, extra) => sum + (extra.price || 0), 0);
      const itemTotal = item.quantity * (item.price + extrasTotal);
      subtotal += itemTotal;
      
      // Normalizar nombre del producto
      const normalizedProductName = normalizeText(item.product_name);
      
      // Formato chileno para el precio total del producto
      const formattedTotal = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(itemTotal);
      
      // Crear linea del producto con precio alineado a la derecha
      const productLine = `${item.quantity}x ${normalizedProductName}`;
      const fontSettings = this.getLocalFontSettings();
      const lineWidth = fontSettings.bold ? 26 : 32;
      // Truncar nombre si excede el espacio disponible
      const maxNameLen = lineWidth - formattedTotal.length - 2;
      const displayLine = productLine.length > maxNameLen
        ? productLine.substring(0, maxNameLen)
        : productLine;
      const paddingLength = Math.max(1, lineWidth - displayLine.length - formattedTotal.length);
      const padding = ' '.repeat(paddingLength);
      
      content += `${displayLine}${padding}${formattedTotal}\n`;
      
      // Agregar extras si existen
      if (item.selectedExtras && Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0) {
        item.selectedExtras.forEach(extra => {
          const normalizedExtraName = normalizeText(extra.extraName);
          if (extra.price > 0) {
            const formattedExtraPrice = new Intl.NumberFormat('es-CL', {
              style: 'currency',
              currency: 'CLP',
              minimumFractionDigits: 0
            }).format(extra.price);
            content += `   + ${normalizedExtraName} ${formattedExtraPrice}\n`;
          } else {
            content += `   + ${normalizedExtraName}\n`;
          }
        });
      }
      
      if (item.notes && item.notes.trim()) {
        const normalizedNotes = normalizeText(item.notes);
        const noteLines = normalizedNotes.trim().split('\n');
        noteLines.forEach((line, index) => {
          if (index === 0) {
            content += `   Nota: ${line}\n`;
          } else {
            content += `         ${line}\n`;
          }
        });
      }
      content += '\n';
    });

    // Calcular costos adicionales
    const deliveryCost = (ticketOrder.section === 'delivery' || ticketOrder.order_type === 'delivery')
      ? (ticketOrder.delivery_cost || ticketOrder.deliveryCost || 0) : 0;

    // Obtener descuento
    const discount = ticketOrder.discount || 0;

    // Obtener propina
    const tip = ticketOrder.tip || ticketOrder.suggestedTip || 0;

    const total = subtotal - discount + deliveryCost + tip;

    // Formatear precios en formato chileno
    const formattedSubtotal = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(subtotal);

    const formattedTotal = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(total);

    content += `================================
RESUMEN
================================

`;

    // Alinear subtotal a la derecha
    const fontSettings = this.getLocalFontSettings();
    const alignWidth = fontSettings.bold ? 26 : 32;
    const subtotalLine = "Subtotal:";
    const subtotalPadding = ' '.repeat(Math.max(1, alignWidth - subtotalLine.length - formattedSubtotal.length));
    content += `${subtotalLine}${subtotalPadding}${formattedSubtotal}`;

    if (discount > 0) {
      const formattedDiscount = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(discount);

      // Alinear descuento a la derecha
      const discountLine = "\nDescuento:";
      const discountPadding = ' '.repeat(Math.max(1, alignWidth - discountLine.length - formattedDiscount.length));
      content += `${discountLine}${discountPadding}-${formattedDiscount}`;
    }

    if (deliveryCost > 0) {
      const formattedDeliveryCost = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(deliveryCost);

      // Alinear costo de envio a la derecha
      const deliveryLine = "\nCosto de envio:";
      const deliveryPadding = ' '.repeat(Math.max(1, alignWidth - deliveryLine.length + 1 - formattedDeliveryCost.length));
      content += `${deliveryLine}${deliveryPadding}${formattedDeliveryCost}`;
    }

    if (tip > 0) {
      const formattedTip = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(tip);

      // Alinear propina a la derecha
      const tipLine = "\nPropina (10%):";
      const tipPadding = ' '.repeat(Math.max(1, alignWidth - tipLine.length + 1 - formattedTip.length));
      content += `${tipLine}${tipPadding}${formattedTip}`;
    }

    // Alinear total a la derecha
    const totalLine = "\nTOTAL:";
    const totalPadding = ' '.repeat(Math.max(1, alignWidth - totalLine.length + 1 - formattedTotal.length));
    content += `${totalLine}${totalPadding}${formattedTotal}`;

    content += `

================================
    Gracias por su compra!
================================




`;

    return content.trim();
  },

  // Imprimir ticket de cliente automaticamente
  async printCustomerTicket(order) {
    const content = this.generateCustomerTicket(order);
    // Use caja printer if configured, otherwise default
    const cajaPrinter = printerConfigService.getPrinterForRole('caja');
    if (cajaPrinter) {
      return this.print(cajaPrinter, content, 1, false);
    }
    return this.printWithDefault(content, 1);
  },

  // Generar reporte de caja cerrada
  generateCashRegisterReport(cashRegister, systemTotalsByPayment = {}) {
    
    const date = new Date();
    
    // Calcular totales usando datos del backend
    const systemTotal = cashRegister.amountSystem || 0;
    const officialTotal = Object.values(cashRegister.officialIncome || {}).reduce((total, amount) => total + (parseFloat(amount) || 0), 0);
    const difference = officialTotal - systemTotal;
    
    // Formatear fechas
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateString));
    };
    
    // Formatear moneda
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(amount || 0);
    };
    
    let content = `
================================
       REPORTE DE CAJA
================================

Fecha del reporte: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
Estado: ${cashRegister.status}

================================
      INFORMACIÓN GENERAL
================================

Fecha de apertura: ${formatDate(cashRegister.dateOpened)}
Fecha de cierre: ${formatDate(cashRegister.dateClosed)}
Monto inicial: ${formatCurrency(cashRegister.initialBalance)}

================================
        RESUMEN VENTAS
================================

Total de pedidos: (Calculado automaticamente)
Total del sistema: ${formatCurrency(systemTotal)}
Total oficial: ${formatCurrency(officialTotal)}
Diferencia: ${difference >= 0 ? '+' : ''}${formatCurrency(difference)}

================================
   VENTAS POR MÉTODO DE PAGO
================================

`;

    // Agregar totales del sistema por metodo de pago
    Object.entries(systemTotalsByPayment).forEach(([method, amount]) => {
      const methodLine = `${method}:`;
      const fontSettings = this.getLocalFontSettings();
      const lineWidth = fontSettings.bold ? 26 : 32;
      const formattedAmount = formatCurrency(amount);
      const paddingLength = Math.max(1, lineWidth - methodLine.length - formattedAmount.length);
      const padding = ' '.repeat(paddingLength);
      content += `${methodLine}${padding}${formattedAmount}\n`;
    });

    content += `
================================
  INGRESOS OFICIALES DECLARADOS
================================

`;

    // Agregar ingresos oficiales
    if (cashRegister.officialIncome) {
      Object.entries(cashRegister.officialIncome).forEach(([method, amount]) => {
        const methodLine = `${method}:`;
        const fontSettings = this.getLocalFontSettings();
        const lineWidth = fontSettings.bold ? 26 : 32;
        const formattedAmount = formatCurrency(amount);
        const paddingLength = Math.max(1, lineWidth - methodLine.length - formattedAmount.length);
        const padding = ' '.repeat(paddingLength);
        content += `${methodLine}${padding}${formattedAmount}\n`;
      });
    }

    // Agregar comentarios si existen
    if (cashRegister.comment && cashRegister.comment.trim()) {
      content += `
================================
        COMENTARIOS
================================

${cashRegister.comment.trim()}

`;
    }

    content += `

================================
     Gestion Restaurante
================================




`;

    return content.trim();
  },

  // Imprimir reporte de caja automaticamente
  async printCashRegisterReport(cashRegister, systemTotalsByPayment = {}) {
    const content = this.generateCashRegisterReport(cashRegister, systemTotalsByPayment);
    // Use caja printer if configured, otherwise default
    const cajaPrinter = printerConfigService.getPrinterForRole('caja');
    if (cajaPrinter) {
      return this.print(cajaPrinter, content, 1, false);
    }
    return this.printWithDefault(content, 1);
  },

  // Abrir caja electrónica (TESTEO)
  async openDrawer(printerName = null) {
    try {
      console.log('📤 Enviando POST a:', printingApi.defaults.baseURL + '/drawer/open', { printerName });
      const payload = printerName ? { printerName } : {};
      const response = await printingApi.post('/drawer/open', payload);
      console.log('📥 Respuesta recibida:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error en openDrawer:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Error al abrir caja'
      };
    }
  }
};

export default printingService;