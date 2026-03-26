/**
 * Printer Configuration Service
 * 
 * Manages multi-printer configuration in localStorage:
 * - Role → Physical Printer mapping (per-workstation)
 * - Resolution of order items → target printers using category printDestinations from DB
 * 
 * The category → role assignments live in MongoDB (printDestinations field).
 * This service only handles the local role → physical printer mapping.
 */

// Available printer roles (extensible for future custom roles)
const AVAILABLE_ROLES = ['cocina', 'barra', 'caja'];

const ROLE_LABELS = {
  cocina: 'Cocina',
  barra: 'Barra',
  caja: 'Caja',
};

const STORAGE_KEY = 'printerRoles';

const printerConfigService = {
  /**
   * Get available printer roles
   */
  getAvailableRoles() {
    return AVAILABLE_ROLES;
  },

  /**
   * Get role display labels
   */
  getRoleLabels() {
    return ROLE_LABELS;
  },

  /**
   * Get role → physical printer mapping from localStorage
   * @returns {Object} e.g. { cocina: "PrinterName1", barra: "PrinterName2" }
   */
  getPrinterRoles() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  },

  /**
   * Set the physical printer for a specific role
   */
  setPrinterForRole(role, printerName) {
    const roles = this.getPrinterRoles();
    if (printerName) {
      roles[role] = printerName;
    } else {
      delete roles[role];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  },

  /**
   * Remove a specific role's printer assignment
   */
  removePrinterRole(role) {
    const roles = this.getPrinterRoles();
    delete roles[role];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  },

  /**
   * Get the physical printer name for a specific role
   * @returns {string|null}
   */
  getPrinterForRole(role) {
    const roles = this.getPrinterRoles();
    return roles[role] || null;
  },

  /**
   * Check if any multi-printer configuration exists
   */
  hasMultiPrinterConfig() {
    const roles = this.getPrinterRoles();
    return Object.keys(roles).length > 0;
  },

  /**
   * Resolve which physical printers should receive items from an order.
   * Groups items by their target printer based on category printDestinations.
   * 
   * @param {Array} orderItems - order.foods array with populated food.category
   * @param {Array} categories - array of category objects with printDestinations
   * @returns {Array} Array of { printerName, items, roles } objects
   *   If no multi-printer config, returns empty array (caller should fallback)
   */
  resolveOrderPrinters(orderItems, categories = []) {
    const printerRoles = this.getPrinterRoles();
    
    // If no roles configured, return empty → caller uses defaultPrinter fallback
    if (Object.keys(printerRoles).length === 0) {
      return [];
    }

    // Build category ID → printDestinations lookup
    const categoryDestinations = {};
    categories.forEach(cat => {
      const id = cat._id || cat.id;
      if (id && Array.isArray(cat.printDestinations) && cat.printDestinations.length > 0) {
        categoryDestinations[id] = cat.printDestinations;
      }
    });

    // Group items by target printer
    // printerMap: { "PrinterName" => { items: [...], roles: Set } }
    const printerMap = {};
    const unassignedItems = [];

    orderItems.forEach(item => {
      // Resolve the category ID from various possible structures
      const food = item.food || item;
      let categoryId = null;
      
      if (food.category) {
        categoryId = typeof food.category === 'object' 
          ? (food.category._id || food.category.id) 
          : food.category;
      }

      const destinations = categoryId ? categoryDestinations[categoryId] : null;

      if (destinations && destinations.length > 0) {
        // Send this item to each assigned role's printer
        destinations.forEach(role => {
          const printerName = printerRoles[role];
          if (printerName) {
            if (!printerMap[printerName]) {
              printerMap[printerName] = { items: [], roles: new Set() };
            }
            printerMap[printerName].items.push(item);
            printerMap[printerName].roles.add(role);
          }
        });
      } else {
        // Category has no destinations configured
        unassignedItems.push(item);
      }
    });

    // If there are unassigned items AND at least one printer has items,
    // add unassigned items to the first configured printer (usually cocina)
    // If NO items were assigned at all, return empty → fallback to defaultPrinter
    if (unassignedItems.length > 0) {
      // Find the first available role-printer in priority order
      const fallbackRole = AVAILABLE_ROLES.find(role => printerRoles[role]);
      if (fallbackRole) {
        const fallbackPrinter = printerRoles[fallbackRole];
        if (!printerMap[fallbackPrinter]) {
          printerMap[fallbackPrinter] = { items: [], roles: new Set() };
        }
        unassignedItems.forEach(item => printerMap[fallbackPrinter].items.push(item));
        printerMap[fallbackPrinter].roles.add(fallbackRole);
      }
    }

    // Convert map to array
    const result = Object.entries(printerMap).map(([printerName, data]) => ({
      printerName,
      items: data.items,
      roles: Array.from(data.roles),
    }));

    return result;
  },
};

export default printerConfigService;
