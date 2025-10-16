# 🖨️ Printing Service - Desarrollo

Servicio de impresión local para el sistema de gestión de restaurantes.

## 🚀 Inicio Rápido

### ✅ Servicio ya instalado (Tu caso)

El servicio **ya está instalado como Windows Service** y corre automáticamente en segundo plano.

- ✅ Se inicia automáticamente con Windows
- ✅ Siempre está disponible en: `http://localhost:8088`
- ✅ No necesitas ejecutar `run-console.bat` cada vez

**Para aplicar cambios en el código:**

```bash
# 1. Detener el servicio
sc stop RestaurantPrintService

# 2. Recompilar
.\dev-rebuild.bat

# 3. Copiar el nuevo ejecutable
copy /Y publish\PrintingService.exe "C:\ruta\donde\instalaste\el\servicio\"

# 4. Reiniciar el servicio
sc start RestaurantPrintService
```

### 🔧 Modo Consola (Opcional para debugging)

Si necesitas ver logs en tiempo real para debuggear:

```bash
# 1. Detener el servicio
sc stop RestaurantPrintService

# 2. Ejecutar en modo consola
.\run-console.bat

# 3. Cuando termines, reiniciar el servicio
sc start RestaurantPrintService
```

---

## 🔧 Desarrollo

### Estructura de archivos importantes
```
printing-service/
├── src/
│   ├── PrintService.cs      # ⚙️ Lógica de impresión (font, márgenes)
│   ├── ApiServer.cs         # 🌐 API REST endpoints
│   ├── PrinterManager.cs    # 🖨️ Gestión de impresoras
│   └── Models/              # 📦 Modelos de datos
├── dev-rebuild.bat          # 🔨 Recompilar rápido
├── run-console.bat          # ▶️ Ejecutar en consola
└── printing-service.csproj  # 📋 Configuración del proyecto
```

### Aplicar cambios (Servicio instalado)

```bash
# 1. Hacer cambios en src/*.cs

# 2. Detener el servicio de Windows
sc stop RestaurantPrintService

# 3. Recompilar
.\dev-rebuild.bat

# 4. Actualizar el ejecutable del servicio
# (reemplaza con la ruta real donde está instalado)
copy /Y publish\PrintingService.exe "C:\Path\To\Service\PrintingService.exe"

# 5. Reiniciar el servicio
sc start RestaurantPrintService
```

### Aplicar cambios (Modo consola - para debugging)

Si prefieres debuggear viendo los logs en tiempo real:

```bash
# 1. Hacer cambios en src/*.cs

# 2. Detener el servicio
sc stop RestaurantPrintService

# 3. Recompilar
.\dev-rebuild.bat

# 4. Ejecutar en modo consola
.\run-console.bat

# 5. Cuando termines, reiniciar el servicio
# Ctrl+C para cerrar la consola
sc start RestaurantPrintService
```

### Cambiar tamaño de fuente o márgenes
Edita `src/PrintService.cs` línea ~73:
```csharp
Font printFont = new Font("Courier New", 9, FontStyle.Regular);
float leftMargin = 10;
```

---

## 📡 API Endpoints

### Health Check
```http
GET http://localhost:8088/health
```

### Obtener impresoras disponibles
```http
GET http://localhost:8088/printers
```

### Imprimir contenido
```http
POST http://localhost:8088/print
Content-Type: application/json

{
  "printerName": "nombre-impresora",
  "content": "texto a imprimir",
  "copies": 1
}
```

---

## 📝 Notas importantes

- ✅ El **formato del ticket** se controla desde el **backend** (`backend/src/services/printServiceClient.js`)
- ✅ Este servicio solo se encarga del **renderizado físico** (font size, márgenes)
- ✅ El servicio está **instalado como Windows Service** y corre automáticamente
- ⚠️ Para aplicar cambios necesitas: detener servicio → recompilar → actualizar .exe → reiniciar servicio
- 💡 **Tip**: Solo necesitas tocar este servicio si cambias font size o márgenes. El formato del ticket se cambia en el backend

---

## 🐛 Troubleshooting

### El servicio no responde
```bash
curl http://localhost:8088/health
# Si no responde, reinicia el servicio
```

### No encuentra la impresora
```bash
# Verifica impresoras disponibles:
curl http://localhost:8088/printers
```

### Error al compilar
```bash
# Limpiar y recompilar:
dotnet clean
dotnet restore
.\dev-rebuild.bat
```

## 🛠️ Instalación

> **💡 Nota Importante**: 
> - **Usuarios finales**: El ejecutable ya compilado NO requiere .NET instalado (self-contained)
> - **Desarrolladores**: Solo necesitan .NET SDK 6.0 si van a compilar el código fuente

### Paso 1: Compilar el Servicio (Solo Desarrolladores)

**Requisito previo**: .NET SDK 6.0 instalado

```bash
# Ejecutar el script de compilación
build.bat
```

Este comando:
- Compila el proyecto en modo Release
- Crea un ejecutable único y portable en la carpeta `publish/`
- Incluye **todas las dependencias de .NET** (self-contained)
- El ejecutable resultante **NO requiere .NET en el equipo del usuario**

### Paso 2: Instalar como Servicio de Windows

```bash
# Ejecutar como Administrador (clic derecho > "Ejecutar como administrador")
install-service.bat
```

Este comando:
- Instala el servicio con el nombre "RestaurantPrintService"
- Configura el servicio para auto-inicio
- Inicia el servicio inmediatamente

### Verificar Instalación

```bash
# Verificar estado del servicio
sc query RestaurantPrintService

# O abrir en el navegador
http://localhost:8088/health
```

## 🔧 Uso

### API Endpoints

#### 1. Health Check
```http
GET http://localhost:8088/health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-13T10:30:00Z"
}
```

#### 2. Listar Impresoras Disponibles
```http
GET http://localhost:8088/printers
```

**Respuesta:**
```json
{
  "printers": [
    {
      "printerName": "Microsoft Print to PDF",
      "status": "Available",
      "isDefault": false
    },
    {
      "printerName": "Thermal Printer TM-T20",
      "status": "Available",
      "isDefault": true
    }
  ]
}
```

#### 3. Enviar Trabajo de Impresión
```http
POST http://localhost:8088/print
Content-Type: application/json

{
  "printerName": "Thermal Printer TM-T20",
  "content": "===============================\n    TICKET DE COMPRA\n===============================\nProducto 1        $10.00\nProducto 2        $15.00\n-------------------------------\nTOTAL:            $25.00\n===============================\n     ¡GRACIAS POR SU COMPRA!\n===============================",
  "contentType": "text",
  "copies": 1
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Print job sent successfully"
}
```

### Ejemplo desde Frontend (React/JavaScript)

```javascript
// services/printService.js
const PRINT_API_URL = 'http://localhost:8088';

export const getPrinters = async () => {
  const response = await fetch(`${PRINT_API_URL}/printers`);
  return response.json();
};

export const printTicket = async (content, printerName = null) => {
  const response = await fetch(`${PRINT_API_URL}/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      printerName,
      content,
      contentType: 'text',
      copies: 1
    })
  });
  return response.json();
};

// Uso en un componente
const handlePrint = async () => {
  try {
    const ticket = `
===============================
    MI RESTAURANTE
===============================
Fecha: ${new Date().toLocaleString()}

Producto 1        $10.00
Producto 2        $15.00
-------------------------------
TOTAL:            $25.00
===============================
   ¡GRACIAS POR SU COMPRA!
===============================
    `;
    
    const result = await printTicket(ticket);
    console.log(result);
  } catch (error) {
    console.error('Error printing:', error);
  }
};
```

## 🎯 Gestión del Servicio

### Modo Consola (Para Pruebas)

```bash
# Ejecutar en modo consola para ver logs en tiempo real
run-console.bat
```

### Comandos de Windows Service

```bash
# Iniciar el servicio
sc start RestaurantPrintService

# Detener el servicio
sc stop RestaurantPrintService

# Ver estado del servicio
sc query RestaurantPrintService

# Ver configuración del servicio
sc qc RestaurantPrintService
```

### Desinstalar el Servicio

```bash
# Ejecutar como Administrador
uninstall-service.bat
```

## 📁 Estructura del Proyecto

```
printing-service/
├── src/
│   ├── Program.cs              # Punto de entrada y configuración del servicio
│   ├── PrintService.cs         # Lógica de impresión
│   ├── ApiServer.cs            # Servidor HTTP API
│   ├── PrinterManager.cs       # Gestión de impresoras
│   └── Models/
│       ├── PrintJob.cs         # Modelo de trabajo de impresión
│       └── PrinterInfo.cs      # Información de impresora
├── build.bat                   # Script de compilación
├── install-service.bat         # Script de instalación
├── uninstall-service.bat       # Script de desinstalación
├── run-console.bat             # Ejecutar en modo consola
└── README.md
```

## 🐛 Solución de Problemas

### El servicio no inicia

1. Verificar que no haya otro proceso usando el puerto 8088:
   ```bash
   netstat -ano | findstr :8088
   ```

2. Revisar los logs de Windows Event Viewer:
   - Abrir "Event Viewer" (Visor de eventos)
   - Ir a "Windows Logs" > "Application"
   - Buscar eventos de "RestaurantPrintService"

### No se detectan impresoras

- Verificar que las impresoras estén instaladas en Windows
- Abrir "Dispositivos e impresoras" en el Panel de Control
- Intentar imprimir una página de prueba desde Windows

### Error de permisos

- Asegurarse de ejecutar los scripts de instalación como Administrador
- Verificar que el usuario tenga permisos para acceder a las impresoras

### La aplicación web no puede conectarse

- Verificar que el servicio esté corriendo: `sc query RestaurantPrintService`
- Comprobar el firewall de Windows (puerto 8088)
- Verificar que la URL sea `http://localhost:8088` (no HTTPS)

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Este servicio está diseñado para uso en **red local únicamente**.

- El servicio solo escucha en `localhost` por seguridad
- No exponer el puerto 8088 a Internet
- Para acceso remoto, usar VPN o túnel SSH

## 📝 Notas de Desarrollo

### Modificar el código

1. Editar los archivos en `src/`
2. Ejecutar `build.bat` para recompilar
3. Ejecutar `uninstall-service.bat` y luego `install-service.bat` para actualizar

### Cambiar el puerto

Editar `ApiServer.cs` línea 15:
```csharp
private readonly string _url = "http://localhost:NUEVO_PUERTO/";
```

### Agregar logging a archivo

Modificar `Program.cs` para agregar FileLogger en la sección `ConfigureLogging`.

## 📄 Licencia

Este proyecto es parte del sistema de gestión de restaurante.

## 🤝 Soporte

Para problemas o sugerencias, crear un issue en el repositorio del proyecto.

The application will start running in the background, ready to receive print requests.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for details.