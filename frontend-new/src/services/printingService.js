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
=================================
        PÁGINA DE PRUEBA
=================================

Fecha: ${new Date().toLocaleString()}
Impresora: ${printerName}

Esta es una página de prueba para
verificar que la impresora está
funcionando correctamente.

=================================
    Gestión Restaurante
=================================




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
    console.log('Generando comanda para pedido:', order);
    
    const date = new Date();
    const orderNumber = order.id || order._id || 'N/A';
    
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

    console.log('Cliente extraído:', customer);

    const orderType = order.section || order.order_type || order.orderType || 'Mostrador';
    
    let content = `
=================================
         COMANDA COCINA
=================================

No. Orden: #${orderNumber}
Cliente: ${customer}
Sección: ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}
`;

    // Agregar notas generales del pedido si existen (antes de productos)
    const orderNotes = order.comment || order.notes || '';
    console.log('Notas del pedido:', orderNotes);
    
    if (orderNotes && orderNotes.trim()) {
      // Manejar notas generales con saltos de línea
      const noteLines = orderNotes.trim().split('\n');
      content += `COMENTARIO GENERAL:\n`;
      noteLines.forEach(line => {
        content += `${line}\n`;
      });
    }

    content += `
=================================
           PRODUCTOS
=================================

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
      console.log('Productos extraídos desde order.foods:', items);
    }
    // Estructura alternativa: order.items
    else if (order.items && Array.isArray(order.items)) {
      items = order.items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || ''
      }));
      console.log('Productos extraídos desde order.items:', items);
    }
    // Estructura alternativa: order.order_items
    else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items.map(item => ({
        product_name: item.product_name || item.name || item.title || 'Producto',
        quantity: item.quantity || 1,
        notes: item.notes || item.comment || ''
      }));
      console.log('Productos extraídos desde order.order_items:', items);
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

    content += `=================================




=`;

    console.log('Contenido de comanda generado:', content);
    return content.trim();
  },

  // Imprimir comanda de cocina automáticamente
  async printKitchenOrder(order) {
    const content = this.generateKitchenOrder(order);
    return this.printWithDefault(content, 1);
  }
};

export default printingService;