/**
 * API para comunicación directa con el servicio de impresión local
 * Este servicio se conecta a localhost:8088 (servicio de impresión instalado localmente)
 */

const LOCAL_PRINT_SERVICE_URL = 'http://localhost:8088';

/**
 * Convierte HTML a texto plano preservando saltos de línea
 * @param {string} html - Texto HTML a convertir
 * @returns {string} Texto plano con saltos de línea
 */
const htmlToPlainText = (html) => {
  if (!html) return '';
  
  // Crear un elemento temporal para parsear el HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Reemplazar <div> y <br> con saltos de línea
  temp.querySelectorAll('div').forEach(div => {
    div.replaceWith('\n' + div.textContent);
  });
  
  temp.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  
  // Obtener el texto limpio
  let text = temp.textContent || temp.innerText || '';
  
  // Limpiar espacios múltiples pero preservar saltos de línea
  text = text.replace(/[ \t]+/g, ' '); // Múltiples espacios/tabs a uno solo
  text = text.replace(/\n+/g, '\n'); // Múltiples saltos de línea a uno solo
  text = text.trim(); // Limpiar espacios al inicio y final
  
  return text;
};

class LocalPrintApi {
  /**
   * Verifica si el servicio de impresión local está disponible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${LOCAL_PRINT_SERVICE_URL}/health`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(2000) // 2 segundos timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch (error) {
      console.log('Servicio de impresión local no disponible:', error.message);
      return false;
    }
  }

  /**
   * Obtiene la lista de impresoras disponibles
   * @returns {Promise<Array<string>>}
   */
  async getPrinters() {
    try {
      const response = await fetch(`${LOCAL_PRINT_SERVICE_URL}/printers`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.printers || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Envía un trabajo de impresión al servicio local
   * @param {string} content - Contenido del ticket a imprimir
   * @param {string} printerName - Nombre de la impresora (opcional, usa la predeterminada si no se especifica)
   * @param {number} copies - Número de copias (default: 1)
   * @returns {Promise<Object>}
   */
  async print(content, printerName = null, copies = 1) {
    try {
      const response = await fetch(`${LOCAL_PRINT_SERVICE_URL}/print`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          printerName,
          contentType: 'text',
          copies
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error imprimiendo:', error);
      throw new Error('Error al imprimir el ticket. Verifica que el servicio de impresión esté corriendo.');
    }
  }

  /**
   * Formatea un ticket de orden para impresión
   * @param {Object} order - Objeto de la orden
   * @param {Object} restaurant - Información del restaurante
   * @param {Object} options - Opciones adicionales
   * @returns {string} Contenido del ticket formateado
   */
  formatOrderTicket(order, restaurant, options = {}) {
    const { printOrderNumber = true } = options;
    const width = 38; // Ancho para impresora térmica de 58mm
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
      return `$${Math.round(parseFloat(amount)).toLocaleString('es-CL')}`;
    };

    let ticket = '';

    // Encabezado
    ticket += line + '\n';
    ticket += center((restaurant?.name || 'RESTAURANTE').toUpperCase()) + '\n';
    if (restaurant?.address) {
      ticket += center(restaurant.address) + '\n';
    }
    ticket += line + '\n';
    
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    ticket += `Fecha: ${orderDate.toLocaleString('es-ES')}\n`;
    
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

      if (order.section === 'delivery' && order.selectedAddress) {
        ticket += `Dirección: ${order.selectedAddress}\n`;
      }
        // Agregar teléfono del cliente si existe
        if (customerData.phone) {
          ticket += `Teléfono: ${customerData.phone}\n`;
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

    const orderItems = order.items || order.foods || [];
    
    orderItems.forEach(item => {
      const qty = `${item.quantity || 1}x`;
      
      let foodName = '';
      if (item.food) {
        foodName = item.food.title || item.food.name || 'Producto';
      } else if (item.title || item.name) {
        foodName = item.title || item.name;
      } else {
        foodName = 'Producto';
      }
      
      const name = foodName.substring(0, width - 12);
      
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
        const cleanNotes = htmlToPlainText(item.notes);
        const notes = cleanNotes.substring(0, width - 7);
        ticket += `   Nota: ${notes}\n`;
      }
      
      if (item.comment) {
        const cleanComment = htmlToPlainText(item.comment);
        const comment = cleanComment.substring(0, width - 10);
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

      // Agregar método de pago si existe
      if (order.payment || order.paymentMethod) {
        const paymentMethod = order.payment || order.paymentMethod;
        ticket += `Pago: ${paymentMethod.toUpperCase()}\n`;
      }
    
    if (order.comment) {
      ticket += '\n';
      ticket += 'Comentario:\n';
      // Convertir HTML a texto plano con saltos de línea correctos
      const cleanComment = htmlToPlainText(order.comment);
      ticket += `${cleanComment}\n`;
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
   * @param {Object} order - Objeto de la orden
   * @param {Object} restaurant - Información del restaurante
   * @returns {string} Contenido del ticket de cocina formateado
   */
  formatKitchenTicket(order, restaurant) {
    const width = 38;
    const line = '='.repeat(width);
    const dash = '-'.repeat(width);

    const center = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    let ticket = '';

    ticket += line + '\n';
    let cocinaTipo = 'COCINA';
    if (order.section === 'delivery') {
      cocinaTipo += ' - DELIVERY';
    } else {
      cocinaTipo += ' - MOSTRADOR';
    }
    ticket += center(`*** ${cocinaTipo} ***`) + '\n';
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
      // Convertir HTML a texto plano con saltos de línea correctos
      const cleanComment = htmlToPlainText(order.comment);
      ticket += `>>> ${cleanComment} <<<\n`;
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
        const cleanNotes = htmlToPlainText(item.notes);
        ticket += `>>> ${cleanNotes} <<<\n`;
      }
      
      if (item.comment) {
        const cleanComment = htmlToPlainText(item.comment);
        ticket += `>>> ${cleanComment} <<<\n`;
      }

      ticket += dash + '\n';
    });

    ticket += '\n';
    ticket += line + '\n';

    return ticket;
  }

  /**
   * Imprime el ticket de una orden
   * @param {Object} order - Objeto de la orden
   * @param {Object} restaurant - Información del restaurante
   * @param {string} printerName - Nombre de la impresora (opcional)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>}
   */
  async printOrderTicket(order, restaurant, printerName = null, options = {}) {
    // Verificar disponibilidad antes de imprimir
    const available = await this.isAvailable();
    if (!available) {
      return { skipped: true };
    }
    const ticketContent = this.formatOrderTicket(order, restaurant, options);
    return await this.print(ticketContent, printerName, options.copies || 1);
  }

  /**
   * Imprime el ticket de cocina
   * @param {Object} order - Objeto de la orden
   * @param {Object} restaurant - Información del restaurante
   * @param {string} printerName - Nombre de la impresora (opcional)
   * @returns {Promise<Object>}
   */
  async printKitchenTicket(order, restaurant, printerName = null) {
    // Verificar disponibilidad antes de imprimir
    const available = await this.isAvailable();
    if (!available) {
      return { skipped: true };
    }
    const ticketContent = this.formatKitchenTicket(order, restaurant);
    return await this.print(ticketContent, printerName, 1);
  }
}

// Exportar instancia única
const localPrintApi = new LocalPrintApi();
export default localPrintApi;
