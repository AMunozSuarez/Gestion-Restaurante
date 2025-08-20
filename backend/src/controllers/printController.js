const fs = require('fs');
const path = require('path');

// Función para obtener lista de impresoras disponibles
const getAvailablePrinters = async (req, res) => {
  try {
    // En Windows, puedes usar PowerShell para listar impresoras
    const { exec } = require('child_process');
    
    exec('powershell "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json"', (error, stdout, stderr) => {
      if (error) {
        console.error('Error obteniendo impresoras:', error);
        return res.status(500).json({
          success: false,
          message: 'Error obteniendo lista de impresoras',
          error: error.message
        });
      }
      
      try {
        const printers = JSON.parse(stdout);
        res.status(200).json({
          success: true,
          message: 'Impresoras obtenidas exitosamente',
          printers: Array.isArray(printers) ? printers : [printers]
        });
      } catch (parseError) {
        res.status(500).json({
          success: false,
          message: 'Error parseando lista de impresoras',
          error: parseError.message
        });
      }
    });
  } catch (error) {
    console.error('Error en getAvailablePrinters:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Función para imprimir comanda usando impresora térmica
const printThermalComanda = async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Datos del pedido requeridos'
      });
    }

    const comandaContent = generateComandaText(order);
    
    res.status(200).json({
      success: true,
      message: 'Comanda térmica generada exitosamente',
      content: comandaContent
    });
    
  } catch (error) {
    console.error('Error generando comanda térmica:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando comanda térmica',
      error: error.message
    });
  }
};

// Función para generar comanda como archivo descargable
const printPDFComanda = async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Datos del pedido requeridos'
      });
    }

    const comandaContent = generateComandaText(order);
    
    // Crear archivo temporal
    const fileName = `comanda_${order.orderNumber}_${Date.now()}.txt`;
    const filePath = path.join(__dirname, '../temp', fileName);
    
    // Crear directorio temp si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Escribir contenido en archivo temporal
    fs.writeFileSync(filePath, comandaContent, 'utf8');
    
    // Enviar archivo al cliente
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
      }
      // Eliminar archivo temporal después de enviarlo
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error eliminando archivo temporal:', unlinkErr);
        }
      });
    });
    
  } catch (error) {
    console.error('Error generando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando archivo',
      error: error.message
    });
  }
};

// Función para imprimir en impresora específica del sistema
const printToSystemPrinter = async (req, res) => {
  try {
    const { order, printerName } = req.body;
    
    if (!order || !printerName) {
      return res.status(400).json({
        success: false,
        message: 'Datos del pedido y nombre de impresora requeridos'
      });
    }

    // Generar contenido de la comanda
    const comandaContent = generateComandaText(order);
    
    // En Windows, usar PowerShell para imprimir
    const { exec } = require('child_process');
    const tempFile = path.join(__dirname, '../temp', `comanda_${Date.now()}.txt`);
    
    // Crear directorio temp si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Escribir contenido en archivo temporal
    fs.writeFileSync(tempFile, comandaContent, 'utf8');
    
    // Comando PowerShell para imprimir
    const printCommand = `powershell "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;
    
    exec(printCommand, (error, stdout, stderr) => {
      // Eliminar archivo temporal
      fs.unlink(tempFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error eliminando archivo temporal:', unlinkErr);
        }
      });
      
      if (error) {
        console.error('Error imprimiendo:', error);
        return res.status(500).json({
          success: false,
          message: 'Error enviando a impresora del sistema',
          error: error.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: `Comanda enviada a impresora: ${printerName}`
      });
    });
    
  } catch (error) {
    console.error('Error en printToSystemPrinter:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Función auxiliar para generar texto de comanda
const generateComandaText = (order) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  let content = '';
  content += '                    COMANDA\n';
  content += `                    #${order.orderNumber}\n\n`;
  content += `Fecha: ${formatDate(order.createdAt)}\n`;
  content += `Sección: ${order.section.toUpperCase()}\n`;
  content += `Estado: ${order.status}\n\n`;
  content += '                    CLIENTE\n';
  content += `Nombre: ${order.buyer?.name || 'Sin nombre'}\n`;
  
  if (order.section === 'delivery') {
    content += `Teléfono: ${order.buyer?.phone || 'No especificado'}\n`;
    content += `Dirección: ${order.selectedAddress || 'No especificada'}\n`;
  }
  
  if (order.comment) {
    content += `Comentario: ${order.comment}\n`;
  }
  content += '\n';
  content += '                    PRODUCTOS\n';
  content += 'Producto                    Cant.  Precio  Total\n';
  content += '----------------------------------------\n';
  
  order.foods.forEach(item => {
    const productName = item.food.title.substring(0, 20);
    const quantity = item.quantity;
    const price = item.food.price;
    const total = price * quantity;
    
    content += `${productName.padEnd(20)} ${quantity.toString().padStart(4)}  ${price.toString().padStart(6)}  ${total.toString().padStart(6)}\n`;
    
    if (item.comment) {
      content += `  - ${item.comment}\n`;
    }
  });
  
  content += '----------------------------------------\n';
  
  const subtotal = order.foods.reduce((sum, item) => sum + (item.food.price * item.quantity), 0);
  content += `Subtotal:                    ${subtotal.toString().padStart(10)}\n`;
  
  if (order.section === 'delivery' && order.deliveryCost > 0) {
    content += `Envío:                       ${order.deliveryCost.toString().padStart(10)}\n`;
  }
  
  content += `TOTAL:                       ${order.total.toString().padStart(10)}\n\n`;
  content += `                    Método de pago: ${order.payment}\n\n`;
  content += '                    ¡Gracias por su pedido!\n';
  content += '                    Comanda generada automáticamente\n\n\n';
  
  return content;
};

module.exports = {
  getAvailablePrinters,
  printThermalComanda,
  printPDFComanda,
  printToSystemPrinter
}; 