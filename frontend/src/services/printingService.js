import axios from 'axios';

// Configuración base para el servicio de impresión
const PRINTING_SERVICE_URL = process.env.REACT_APP_PRINTING_SERVICE_URL || 'http://localhost:8088';

// Crear instancia específica para el servicio de impresión
const printingApi = axios.create({
  baseURL: PRINTING_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Servicio de impresión
export const printingService = {
  // Verificar el estado del servicio de impresión
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
        error: error.response?.data?.message || 'Servicio de impresión no disponible'
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
  async print(printerName, content, copies = 1) {
    try {
      const response = await printingApi.post('/print', {
        printerName,
        content,
        copies
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error printing:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al imprimir'
      };
    }
  },

  // Imprimir página de prueba
  async printTest(printerName) {
    const testContent = `
================================
        PÁGINA DE PRUEBA
================================

Fecha: ${new Date().toLocaleString()}
Impresora: ${printerName}

Esta es una página de prueba para
verificar que la impresora está
funcionando correctamente.

================================
    Gestión Restaurante
================================




    `;

    return this.print(printerName, testContent.trim(), 1);
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
  async printWithDefault(content, copies = 1) {
    const defaultPrinter = this.getDefaultPrinter();
    if (!defaultPrinter) {
      return {
        success: false,
        error: 'No hay impresora predeterminada configurada'
      };
    }

    return this.print(defaultPrinter, content, copies);
  },

  // Generar comanda de cocina
  generateKitchenOrder(order) {
    
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
    
    let content = `
================================
         COMANDA COCINA
================================

No. Orden: #${orderNumber}
Cliente: ${customer}
Sección: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}
`;

    // Agregar notas generales del pedido si existen (antes de productos)
    const orderNotes = order.comment || order.notes || '';
    if (orderNotes && orderNotes.trim()) {
      // Manejar notas generales con saltos de línea
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

    // Agregar cada producto al contenido
    items.forEach(item => {
      content += `${item.quantity}x ${item.product_name}\n`;
      if (item.notes && item.notes.trim()) {
        // Manejar comentarios con saltos de línea
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

    content += `================================




=`;

    return content.trim();
  },

  // Imprimir comanda de cocina automáticamente
  async printKitchenOrder(order) {
    const content = this.generateKitchenOrder(order);
    return this.printWithDefault(content, 1);
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

    // Extraer teléfono del cliente
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

    // Extraer dirección (para todos los tipos de pedido)
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
      content += `\nTeléfono: ${phone}`;
    }

    if (address) {
      content += `\nDirección: ${address}`;
    }

    // Agregar método de pago
    // Usar solo paymentMethods
    let paymentMethod = 'No especificado';
    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
      paymentMethod = order.paymentMethods.map(pm => {
        const method = pm.method || pm.name || 'Método';
        const amount = pm.amount ? `(${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(pm.amount)})` : '';
        return `${method} ${amount}`.trim();
      }).join(' + ');
    }
    content += `\nMétodo de pago: ${paymentMethod}`;

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
      
      // Crear línea del producto con precio alineado a la derecha
      const productLine = `${item.quantity}x ${item.product_name}`;
      const lineWidth = 32; // Ancho total de la línea (32 CPL mínimo garantizado)
      const paddingLength = Math.max(1, lineWidth - productLine.length - formattedTotal.length);
      const padding = ' '.repeat(paddingLength);
      
      content += `${productLine}${padding}${formattedTotal}\n`;
      
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
    const subtotalLine = "Subtotal:";
    const subtotalPadding = ' '.repeat(Math.max(1, 32 - subtotalLine.length - formattedSubtotal.length));
    content += `${subtotalLine}${subtotalPadding}${formattedSubtotal}`;

    if (deliveryCost > 0) {
      const formattedDeliveryCost = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(deliveryCost);
      
      // Alinear costo de envío a la derecha
      const deliveryLine = "\nCosto de envío:";
      const deliveryPadding = ' '.repeat(Math.max(1, 32 - deliveryLine.length + 1 - formattedDeliveryCost.length));
      content += `${deliveryLine}${deliveryPadding}${formattedDeliveryCost}`;
    }

    // Alinear total a la derecha
    const totalLine = "\nTOTAL:";
    const totalPadding = ' '.repeat(Math.max(1, 32 - totalLine.length + 1 - formattedTotal.length));
    content += `${totalLine}${totalPadding}${formattedTotal}`;

    content += `

================================
    ¡Gracias por su compra!
================================




`;

    return content.trim();
  },

  // Imprimir ticket de cliente automáticamente
  async printCustomerTicket(order) {
    const content = this.generateCustomerTicket(order);
    return this.printWithDefault(content, 1);
  },

  // Generar reporte de caja cerrada
  generateCashRegisterReport(cashRegister) {
    
    const date = new Date();
    
    // Calcular totales usando datos del backend
    const systemTotal = cashRegister.amountSystem || 0;
    const officialTotal = Object.values(cashRegister.officialIncome || {}).reduce((total, amount) => total + (parseFloat(amount) || 0), 0);
    const difference = officialTotal - systemTotal;
    
    // Los totales por método de pago deberán ser calculados desde las órdenes reales
    // Por ahora usar un objeto vacío como fallback
    const systemTotalsByPayment = {};
    
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

Total de pedidos: (Calculado automáticamente)
Total del sistema: ${formatCurrency(systemTotal)}
Total oficial: ${formatCurrency(officialTotal)}
Diferencia: ${difference >= 0 ? '+' : ''}${formatCurrency(difference)}

================================
   VENTAS POR MÉTODO DE PAGO
================================

`;

    // Agregar totales del sistema por método de pago
    Object.entries(systemTotalsByPayment).forEach(([method, amount]) => {
      const methodLine = `${method}:`;
      const lineWidth = 32;
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
        const lineWidth = 32;
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
     Gestión Restaurante
================================




`;

    return content.trim();
  },

  // Imprimir reporte de caja automáticamente
  async printCashRegisterReport(cashRegister) {
    const content = this.generateCashRegisterReport(cashRegister);
    return this.printWithDefault(content, 1);
  }
};

export default printingService;