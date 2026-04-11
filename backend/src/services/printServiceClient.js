const axios = require('axios');

// URL del servicio de impresión local
const PRINT_SERVICE_URL = process.env.PRINT_SERVICE_URL || 'http://localhost:8088';
const CHILE_TIME_ZONE = 'America/Santiago';

/**
 * Servicio para interactuar con la aplicación de impresión local
 */
class PrintServiceClient {
  /**
   * Verifica si el servicio de impresión está disponible
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${PRINT_SERVICE_URL}/health`, {
        timeout: 2000
      });
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Print service not available:', error.message);
      return false;
    }
  }

  /**
   * Obtiene las impresoras disponibles desde el servicio local
   */
  async getPrinters() {
    try {
      const response = await axios.get(`${PRINT_SERVICE_URL}/printers`);
      return response.data.printers || [];
    } catch (error) {
      console.error('Error fetching printers:', error.message);
      throw new Error('No se pudieron obtener las impresoras');
    }
  }

  /**
   * Envía un trabajo de impresión al servicio local
   */
  async print(content, printerName = null, copies = 1, isKitchen = false) {
    try {
      const response = await axios.post(`${PRINT_SERVICE_URL}/print`, {
        printerName,
        content,
        contentType: 'text',
        copies,
        isKitchen
      }, {
        timeout: 10000 // 10 segundos para imprimir
      });
      return response.data;
    } catch (error) {
      console.error('Error printing:', error.message);
      throw new Error('Error al imprimir el ticket');
    }
  }

  /**
   * Formatea un ticket de orden para imprimir
   */
  formatOrderTicket(order, restaurant, options = {}) {
    const { printOrderNumber = true } = options;
    const width = 32; // Ancho para impresora térmica de 58mm (32 CPL mínimo garantizado)
    const line = '='.repeat(width);
    const dash = '-'.repeat(width);

    const center = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const rightAlign = (left, right) => {
      const spaces = width - left.length - right.length;
      return left + ' '.repeat(Math.max(1, spaces)) + right;
    };

    const formatCurrency = (amount) => {
      // Formato chileno: $1.000 (sin decimales, separador de miles con punto)
      return `$${Math.round(parseFloat(amount)).toLocaleString('es-CL')}`;
    };

    let ticket = '';

    // Encabezado
    ticket += line + '\n';
    ticket += center((restaurant?.name || 'RESTAURANTE').toUpperCase()) + '\n';
    if (restaurant?.address) {
      ticket += center(restaurant.address) + '\n';
    }
    if (restaurant?.phone) {
      ticket += center(`Tel: ${restaurant.phone}`) + '\n';
    }
    ticket += line + '\n';
    
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    ticket += `Fecha: ${orderDate.toLocaleString('es-CL', { timeZone: CHILE_TIME_ZONE })}\n`;
    
    // Solo incluir número de orden si está habilitado
    if (printOrderNumber) {
      ticket += `Orden #${order.orderNumber || order._id?.toString().slice(-6).toUpperCase() || 'N/A'}\n`;
    }
    
    if (order.table) {
      ticket += `Mesa: ${order.table.number || order.table}\n`;
    }
    
    const customerData = order.buyer || order.customer || (order.name ? { name: order.name } : null);
    if (customerData) {
      const customerName = typeof customerData === 'string' 
        ? customerData 
        : customerData.name || customerData.firstName || 'Cliente';
      ticket += `Cliente: ${customerName}\n`;

      // Solo incluir dirección en órdenes de delivery
      if (order.section === 'delivery' && order.selectedAddress) {
        ticket += `Dirección: ${order.selectedAddress}\n`;
      }
    }
    
    if (order.waiter) {
      const waiterName = typeof order.waiter === 'string'
        ? order.waiter
        : order.waiter.name || 'Mesero';
      ticket += `Mesero: ${waiterName}\n`;
    }
    
    ticket += dash + '\n';

    // Items
    ticket += 'ITEMS:\n';
    ticket += dash + '\n';

    // Procesar items (puede venir como items o foods)
    const orderItems = order.items || order.foods || [];
    
    orderItems.forEach(item => {
      const qty = `${item.quantity || 1}x`;
      
      // Obtener nombre del producto
      let foodName = '';
      if (item.food) {
        foodName = item.food.title || item.food.name || 'Producto';
      } else if (item.title || item.name) {
        foodName = item.title || item.name;
      } else {
        foodName = 'Producto';
      }
      
      const name = foodName.substring(0, width - 12);
      
      // Calcular precio
      let itemPrice = 0;
      if (item.subtotal) {
        itemPrice = item.subtotal;
      } else if (item.price) {
        itemPrice = item.price * (item.quantity || 1);
      } else if (item.food && item.food.price) {
        itemPrice = item.food.price * (item.quantity || 1);
      }
      
      const price = formatCurrency(itemPrice);

      ticket += rightAlign(`${qty} ${name}`, price) + '\n';

      if (item.notes) {
        const notes = item.notes.substring(0, width - 7);
        ticket += `   Nota: ${notes}\n`;
      }
      
      if (item.comment) {
        const comment = item.comment.substring(0, width - 10);
        ticket += `   Comentario: ${comment}\n`;
      }
    });

    ticket += dash + '\n';

    // Totales
    let subtotal = order.subtotal || 0;
    if (!subtotal && orderItems.length > 0) {
      subtotal = orderItems.reduce((sum, item) => {
        if (item.subtotal) return sum + item.subtotal;
        if (item.price) return sum + (item.price * (item.quantity || 1));
        if (item.food && item.food.price) return sum + (item.food.price * (item.quantity || 1));
        return sum;
      }, 0);
    }
    
    ticket += rightAlign('Subtotal:', formatCurrency(subtotal)) + '\n';

    // Solo incluir costo de envío en órdenes de delivery
    if (order.section === 'delivery' && order.selectedAddress && order.buyer?.addresses) {
      const selectedAddressData = order.buyer.addresses.find(
        addr => addr.address === order.selectedAddress
      );
      if (selectedAddressData && selectedAddressData.deliveryCost > 0) {
        ticket += rightAlign('Envío:', formatCurrency(selectedAddressData.deliveryCost)) + '\n';
      }
    }

    if (order.tax && order.tax > 0) {
      ticket += rightAlign('Impuestos:', formatCurrency(order.tax)) + '\n';
    }

    if (order.discount && order.discount > 0) {
      ticket += rightAlign('Descuento:', `-${formatCurrency(order.discount)}`) + '\n';
    }

    ticket += line + '\n';
    ticket += rightAlign('TOTAL:', formatCurrency(order.total || subtotal)) + '\n';
    ticket += line + '\n';

    // Método de pago
    if (order.paymentMethod) {
      ticket += `Pago: ${order.paymentMethod.toUpperCase()}\n`;
    }
    
    if (order.comment) {
      ticket += '\n';
      ticket += 'Comentario:\n';
      ticket += `${order.comment}\n`;
    }

    ticket += '\n';
    ticket += center('¡GRACIAS POR SU VISITA!') + '\n';
    ticket += center('Vuelva Pronto') + '\n';
    ticket += '\n';
    ticket += line + '\n';

    return ticket;
  }

  /**
   * Formatea un ticket de cocina
   */
  formatKitchenTicket(order, restaurant) {
    const width = 32; // Ancho para impresora térmica de 58mm (32 CPL mínimo garantizado)
    const line = '='.repeat(width);
    const dash = '-'.repeat(width);

    const center = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    let ticket = '';

    // Encabezado
    ticket += line + '\n';
    ticket += center('*** COCINA ***') + '\n';
    ticket += line + '\n';
    ticket += `Orden #${order.orderNumber || order._id?.toString().slice(-6).toUpperCase() || 'N/A'}\n`;
    
    if (order.table) {
      ticket += `MESA: ${order.table.number || order.table}\n`;
    }
    
    const customerData = order.buyer || order.customer || (order.name ? { name: order.name } : null);
    if (customerData) {
      const customerName = typeof customerData === 'string' 
        ? customerData 
        : customerData.name || customerData.firstName || 'Cliente';
      ticket += `Cliente: ${customerName}\n`;
    }
    
    if (order.waiter) {
      const waiterName = typeof order.waiter === 'string'
        ? order.waiter
        : order.waiter.name || 'Mesero';
      ticket += `Mesero: ${waiterName}\n`;
    }
    
    ticket += dash + '\n';
    
    if (order.comment) {
      ticket += '\n';
      ticket += '*** NOTA GENERAL ***\n';
      ticket += `>>> ${order.comment} <<<\n`;
      ticket += '\n';
      ticket += dash + '\n';
    }

    const orderItems = order.items || order.foods || [];
    
    orderItems.forEach(item => {
      let foodName = '';
      if (item.food) {
        foodName = item.food.title || item.food.name || 'Producto';
      } else if (item.title || item.name) {
        foodName = item.title || item.name;
      } else {
        foodName = 'Producto';
      }
      
      ticket += `\n${item.quantity || 1}x ${foodName.toUpperCase()}\n`;

      if (item.notes) {
        ticket += `>>> ${item.notes} <<<\n`;
      }
      
      if (item.comment) {
        ticket += `>>> ${item.comment} <<<\n`;
      }

      ticket += dash + '\n';
    });

    ticket += '\n';
    ticket += line + '\n';

    return ticket;
  }
}

module.exports = new PrintServiceClient();
