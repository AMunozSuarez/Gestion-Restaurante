import axios from 'axios';

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
    
    const isUpdate = (options.newFoods && options.newFoods.length > 0) ||
                     (options.deletedFoods && options.deletedFoods.length > 0);

    let content;
    if (isUpdate) {
      content = `
================================
   *** ACTUALIZACION PEDIDO ***
================================

No. Orden: #${orderNumber}
Cliente: ${customer}
Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}
Hora: ${date.toLocaleTimeString()}
`;
    } else {
      content = `
================================
         COMANDA COCINA
================================

No. Orden: #${orderNumber}
Cliente: ${customer}
Seccion: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}
Hora: ${date.toLocaleTimeString()}
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
    
    // Estructura del backend: order.foods
    if (order.foods && Array.isArray(order.foods)) {
      items = order.foods.map(item => ({
        product_name: item.food?.title || item.food?.name || 'Producto',
        quantity: item.quantity || 1,
        notes: item.comment || ''
      }));
    }
    // Estructura alternativa: order.items
    else if (order.items && Array.isArray(order.items)) {
      items = order.items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || ''
      }));
    }
    // Estructura alternativa: order.order_items
    else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || ''
      }));
    }

    // Agregar cada producto al contenido (marcado para negrita si esta configurado)
    content += `[BOLD]`;
    items.forEach(item => {
      content += `${item.quantity}x ${item.product_name}\n`;
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

    // Si es actualización, mostrar secciones de productos eliminados y nuevos
    if (isUpdate) {
      if (options.deletedFoods && options.deletedFoods.length > 0) {
        content += `\n================================\n`;
        content += `   --- ELIMINAR ---\n`;
        content += `================================\n`;
        options.deletedFoods.forEach(item => {
          const name = item.name || item.food?.title || item.food?.name || 'Producto';
          content += `*** ${item.quantity}x ${name} ***\n`;
          if (item.comment) {
            content += `   Nota: ${item.comment}\n`;
          }
        });
      }
      if (options.newFoods && options.newFoods.length > 0) {
        content += `\n================================\n`;
        content += `   +++ AGREGAR NUEVO +++\n`;
        content += `================================\n`;
        content += `[BOLD]`;
        options.newFoods.forEach(item => {
          const name = item.name || item.food?.title || item.food?.name || 'Producto';
          content += `>>> ${item.quantity}x ${name}\n`;
          if (item.comment) {
            content += `   Nota: ${item.comment}\n`;
          }
        });
        content += `[/BOLD]`;
      }
    }

    content += `\n================================`;

    return content.trim();
  },

  // Imprimir comanda de cocina automaticamente
  async printKitchenOrder(order, options = {}) {
    const content = this.generateKitchenOrder(order, options);
    return this.printWithDefault(content, 1, true); // isKitchen=true para aplicar negrita si esta configurado
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
    
    const total = subtotal + deliveryCost;

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
    return this.printWithDefault(content, 1);
  }
};

export default printingService;