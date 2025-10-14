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
    
    console.log('Datos recibidos para impresión:', {
      orderExists: !!order,
      orderNumber: order?.orderNumber,
      foodsLength: order?.foods?.length,
      foodsStructure: order?.foods?.map(item => ({
        hasFood: !!item.food,
        foodTitle: item.food?.title,
        foodPrice: item.food?.price,
        quantity: item.quantity
      }))
    });
    
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
    
    // Escribir contenido en archivo temporal sin BOM para evitar problemas de orden
    fs.writeFileSync(tempFile, comandaContent, 'utf8');
    
    console.log('Archivo temporal creado:', tempFile);
    console.log('Contenido del archivo (primeras 200 chars):', comandaContent.substring(0, 200));
    
    // Usar método más compatible con PowerShell que funciona con todos los tipos de impresora
    const printCommand = `powershell "try { Get-Content -Path '${tempFile}' -Raw | Out-Printer -Name '${printerName}'; Write-Host 'Impresion exitosa' } catch { Write-Error $_.Exception.Message; exit 1 }"`;
    
    console.log('Ejecutando comando de impresión:', printCommand);
    
    // Primero verificar que la impresora existe
    const verifyCommand = `powershell "Get-Printer -Name '${printerName}' -ErrorAction SilentlyContinue | Select-Object Name"`;
    
    exec(verifyCommand, (verifyError, verifyStdout, verifyStderr) => {
      if (verifyError || !verifyStdout.includes(printerName)) {
        console.warn(`Impresora '${printerName}' no encontrada, intentando impresión directa...`);
      }
      
      // Proceder con la impresión
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
        
        console.log('Impresión exitosa:', stdout);
        res.status(200).json({
          success: true,
          message: `Comanda enviada a impresora: ${printerName}`
        });
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

// Función auxiliar para generar texto de comanda de cocina
const generateComandaText = (order) => {
  console.log('Datos recibidos para generar comanda:', order);
  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Usar un array para garantizar el orden correcto
  const lines = [];
  
  // Encabezado
  lines.push('      COMANDA COCINA');
  lines.push(`        #${order.orderNumber}`);
  lines.push('');
  lines.push(`${formatDate(order.createdAt)}`);
  lines.push(`${order.section.toUpperCase()}`);
  lines.push('');
  
  // Información del cliente (solo nombre)
  lines.push(`CLIENTE: ${order.name || order.buyer?.name || 'Sin nombre'}`);
  lines.push('');
  
  // Comentario general del pedido si existe
  if (order.comment) {
    lines.push(`*** COMENTARIO PEDIDO ***`);
    lines.push(`${order.comment}`);
    lines.push('');
  }
  
  // Productos
  lines.push('--------------------------------');
  lines.push('Producto                    Cant.');
  
  
  if (order.foods && order.foods.length > 0) {
    order.foods.forEach(item => {
      // Verificar que item.food existe y tiene las propiedades necesarias
      if (!item.food) {
        console.warn('Item sin datos de alimento:', item);
        return;
      }
      
      const productName = (item.food.title || 'Producto sin nombre').substring(0, 24);
      const quantity = item.quantity || 1;
      
      lines.push(`${productName.padEnd(24)} ${quantity.toString().padStart(4)}`);
      
      // Comentario específico del producto si existe
      if (item.comment) {
        lines.push(`*** ${item.comment} ***`);
        lines.push(`-------------`);
        lines.push('');
        lines.push('');
      }
    });
    lines.push('         ');
    lines.push('         ');
    lines.push('         ');
  }
  
  // Cierre
  lines.push('--------------------------------');
  lines.push('');
  lines.push('PREPARAR PEDIDO');
  lines.push('');
  lines.push('');
  
  // Unir todas las líneas y agregar saltos de línea adicionales al final
  const content = lines.join('\n') + '\n\n\n';
  
  console.log('Comanda generada (primeras 200 chars):', content.substring(0, 200));
  console.log('Comanda generada (últimas 100 chars):', content.substring(content.length - 100));
  
  return content;
};

// Función alternativa para impresión directa a puerto
const printDirectToPort = async (req, res) => {
  try {
    const { order, printerName } = req.body;
    
    if (!order || !printerName) {
      return res.status(400).json({
        success: false,
        message: 'Datos del pedido y nombre de impresora requeridos'
      });
    }

    const comandaContent = generateComandaText(order);
    
    // Intentar impresión directa al puerto (para impresoras de texto)
    const { exec } = require('child_process');
    
    // Crear archivo temporal para impresión directa
    const tempFile = path.join(__dirname, '../temp', `comanda_direct_${Date.now()}.txt`);
    
    // Crear directorio temp si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempFile, comandaContent, 'utf8');
    
    // Usar PowerShell con manejo de errores mejorado
    const directCommand = `powershell "try { Get-Content -Path '${tempFile}' | Out-Printer -Name '${printerName}'; Write-Host 'Impresion directa exitosa' } catch { Write-Error $_.Exception.Message; exit 1 }"`;
    
    console.log('Impresión directa mejorada:', directCommand);
    
    exec(directCommand, (error, stdout, stderr) => {
      // Eliminar archivo temporal
      fs.unlink(tempFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error eliminando archivo temporal directo:', unlinkErr);
        }
      });
      if (error) {
        console.error('Error en impresión directa:', error);
        return res.status(500).json({
          success: false,
          message: 'Error en impresión directa al puerto',
          error: error.message
        });
      }
      
      res.status(200).json({
        success: true,
        message: `Comanda enviada directamente a: ${printerName}`
      });
    });
    
  } catch (error) {
    console.error('Error en printDirectToPort:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getAvailablePrinters,
  printThermalComanda,
  printPDFComanda,
  printToSystemPrinter,
  printDirectToPort
}; 