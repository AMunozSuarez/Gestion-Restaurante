import axios from 'axios';
import printerConfigService from './printerConfigService';

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
        PÁGINA DE PRUEBA
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
      // Sincronizar con localStorage
      localStorage.setItem('printFontSettings', JSON.stringify(response.data));
      return { success: true, data: response.data };
    } catch (error) {
      // Fallback a localStorage si el servicio no esta disponible
      const local = this.getLocalFontSettings();
      return { success: false, data: local };
    }
  },

  // Guardar configuracion de fuente en el servicio C# y localStorage
  async saveSettings(settings) {
    try {
      localStorage.setItem('printFontSettings', JSON.stringify(settings));
      const response = await printingApi.post('/settings', settings);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error saving font settings:', error);
      return { success: false, error: 'Error al guardar configuracion' };
    }
  },

  // Obtener configuracion de fuente desde localStorage (sincrono)
  getLocalFontSettings() {
    try {
      const saved = localStorage.getItem('printFontSettings');
      return saved ? JSON.parse(saved) : { fontSize: 9, bold: false };
    } catch {
      return { fontSize: 9, bold: false };
    }
  },

  // Generar comanda de cocina
  generateKitchenOrder(order, options = {}) {

    const date = new Date();
    const orderNumber = order.orderNumber || order.id || order._id || 'N/A';

    // Extraer nombre del cliente desde diferentes posibles campos
    let customer = 'Cliente';
    if (order.buyer && typeof order.buyer === 'object' && order.buyer.name) {
      // Cliente populated desde la base de datos
      customer = order.buyer.name || order.name;
    } else if (order.name) {
      // Cliente sin guardar (campo name directamente en el pedido)
      customer = order.name;
    } else if (order.customer_name) {
      // Formato alternativo
      customer = order.customer_name;
    } else if (order.customerName) {
      // Formato alternativo
      customer = order.customerName;
    }

    const orderType = order.section || order.order_type || order.orderType || 'Mostrador';
    const isMesas = orderType.toLowerCase() === 'mesas';

    // Extraer datos de mesa y garzón para sección mesas
    const tableNumber = order.tableNumber || '';
    let waiterName = '';
    if (order.waiter && typeof order.waiter === 'object') {
      waiterName = order.waiter.userName || order.waiter.name || '';
    } else if (order.waiterName) {
      waiterName = order.waiterName;
    }

    const isUpdate = (options.newFoods && options.newFoods.length > 0) ||
                     (options.deletedFoods && options.deletedFoods.length > 0);

    let content;
    if (isUpdate) {
      content = `
================================
   *** ACTUALIZACION PEDIDO ***
================================

No. Orden: #${orderNumber}
`;
      // Para sección mesas: mostrar Mesa y Garzón, NO mostrar cliente
      if (isMesas) {
        if (tableNumber) content += `Mesa: ${tableNumber}\n`;
        if (waiterName) content += `Garzon: ${waiterName}\n`;
      } else {
        content += `Cliente: ${customer}\n`;
        content += `Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}\n`;
      }
      content += `Hora: ${date.toLocaleTimeString()}
`;
    } else {
      content = `
================================
         COMANDA COCINA
================================

No. Orden: #${orderNumber}
`;
      // Para sección mesas: mostrar Mesa y Garzón, NO mostrar cliente
      if (isMesas) {
        if (tableNumber) content += `Mesa: ${tableNumber}\n`;
        if (waiterName) content += `Garzon: ${waiterName}\n`;
      } else {
        content += `Cliente: ${customer}\n`;
        content += `Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}\n`;
      }
      content += `Hora: ${date.toLocaleTimeString()}
`;
    }

    // Agregar notas generales del pedido si existen (antes de productos)
    const orderNotes = order.comment || order.notes || '';
    if (orderNotes && orderNotes.trim()) {
      // Manejar notas generales con saltos de linea
      const noteLines = orderNotes.trim().split('\n');
      content += `COMENTARIO GENERAL:\n`;
      noteLines.forEach(line => {
        content += `${line}\n`;
      });
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
        isNew: item.isNew || false
      }));
    }
    // Estructura del backend: order.foods
    else if (order.foods && Array.isArray(order.foods)) {
      items = order.foods.map(item => ({
        product_name: item.food?.title || item.food?.name || 'Producto',
        product_id: item.food?._id || item.food,
        quantity: item.quantity || 1,
        notes: item.comment || '',
        isNew: false
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
        isNew: false
      }));
    }
    // Estructura alternativa: order.order_items
    else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || '',
        isNew: false
      }));
    }

    // Agregar cada producto al contenido (marcado para negrita si esta configurado)
    content += `[BOLD]`;
    items.forEach(item => {
      content += `${item.isNew ? '* ' : ''}${item.quantity}x ${item.product_name}\n`;
      if (item.notes && item.notes.trim()) {
        // Manejar comentarios con saltos de linea
        const noteLines = item.notes.trim().split('\n');
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

    // IMPORTANT: Always use order.foods for routing because it has populated category data.
    // options.allFoods may be present (update flow) but only has {food: id-string, name}
    // without category info — resolveOrderPrinters needs category IDs to route.
    const routingItems = order.foods || [];

    // Try multi-printer resolution using the populated order.foods
    const printerTargets = printerConfigService.resolveOrderPrinters(routingItems, categories);

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
        // Annotate each item's food with isNew from allFoods if available
        const annotatedItems = target.items.map(item => {
          const foodId = item.food?._id || item.food;
          const allFoodsItem = foodId ? allFoodsById[foodId] : null;
          return allFoodsItem ? { ...item, _isNew: allFoodsItem.isNew || false } : item;
        });

        // Generate ticket with only the items for this printer
        // generateKitchenOrderForItems strips allFoods so it uses filtered items
        const content = this.generateKitchenOrderForItems(order, annotatedItems, options, target.roles);
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

  // Generar ticket de cliente
  generateCustomerTicket(order) {
    
    const date = new Date();
    const orderNumber = order.orderNumber || order.id || order._id || 'N/A';
    
    // Extraer nombre del cliente
    let customer = 'Cliente';
    if (order.buyer && typeof order.buyer === 'object' && order.buyer.name) {
      customer = order.buyer.name || order.name;
    } else if (order.name) {
      customer = order.name;
    } else if (order.customer_name) {
      customer = order.customer_name;
    } else if (order.customerName) {
      customer = order.customerName;
    }

    // Extraer telefono del cliente
    let phone = '';
    if (order.buyer && typeof order.buyer === 'object' && order.buyer.phone) {
      phone = order.buyer.phone || order.phone;
    } else if (order.phone) {
      phone = order.phone;
    } else if (order.customer_phone) {
      phone = order.customer_phone;
    } else if (order.customerPhone) {
      phone = order.customerPhone;
    }

    // Extraer direccion (para todos los tipos de pedido)
    let address = '';
    if (order.selectedAddress) {
      // selectedAddress puede ser string o objeto
      if (typeof order.selectedAddress === 'string') {
        address = order.selectedAddress;
      } else if (typeof order.selectedAddress === 'object') {
        const addr = order.selectedAddress;
        address = `${addr.street || ''} ${addr.number || ''}, ${addr.neighborhood || ''}`.trim();
        if (addr.reference) {
          address += `\nRef: ${addr.reference}`;
        }
      }
    } else if (order.address && typeof order.address === 'object') {
      const addr = order.address;
      address = `${addr.street || ''} ${addr.number || ''}, ${addr.neighborhood || ''}`.trim();
      if (addr.reference) {
        address += `\nRef: ${addr.reference}`;
      }
    } else if (order.address_text) {
      address = order.address_text;
    } else if (order.addressText) {
      address = order.addressText;
    }

    const orderType = order.section || order.order_type || order.orderType || 'Mostrador';
    
    let content = `
================================
        TICKET CLIENTE
================================

No. Orden: #${orderNumber}
Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
Cliente: ${customer}`;

    if (phone) {
      content += `\nTelefono: ${phone}`;
    }

    if (address) {
      content += `\nDireccion: ${address}`;
    }

    // Agregar metodo de pago
    // Usar solo paymentMethods
    let paymentMethod = 'No especificado';
    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
      paymentMethod = order.paymentMethods.map(pm => {
        const method = pm.method || pm.name || 'Metodo';
        const amount = pm.amount ? `(${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(pm.amount)})` : '';
        return `${method} ${amount}`.trim();
      }).join(' + ');
    }
    content += `\nMetodo de pago: ${paymentMethod}`;

    // Agregar comentarios generales si existen
    const orderNotes = order.comment || order.notes || '';
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
    
    if (order.foods && Array.isArray(order.foods)) {
      items = order.foods.map(item => ({
        product_name: item.food?.title || item.food?.name || 'Producto',
        quantity: item.quantity || 1,
        price: item.food?.price || 0,
        notes: item.comment || ''
      }));
    } else if (order.items && Array.isArray(order.items)) {
      items = order.items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || item.comment || ''
      }));
    } else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || item.comment || ''
      }));
    }

    // Agregar cada producto al contenido
    items.forEach(item => {
      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;
      
      // Formato chileno para el precio total del producto
      const formattedTotal = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(itemTotal);
      
      // Crear linea del producto con precio alineado a la derecha
      const productLine = `${item.quantity}x ${item.product_name}`;
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
      
      if (item.notes && item.notes.trim()) {
        const noteLines = item.notes.trim().split('\n');
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
    const deliveryCost = (order.section === 'delivery' || order.order_type === 'delivery')
      ? (order.delivery_cost || order.deliveryCost || 0) : 0;

    // Obtener descuento
    const discount = order.discount || 0;

    // Obtener propina
    const tip = order.tip || order.suggestedTip || 0;

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
      const tipLine = "\nPropina:";
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
  }
};

export default printingService;