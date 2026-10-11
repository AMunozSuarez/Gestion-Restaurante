// Pantalla de cliente del mostrador. Cada pantalla es un usuario con rol
// "carrito"; cada equipo de mostrador decide a cuál de ellas envía su carrito.
// Esa vinculación es por dispositivo (dos cajas pueden tener pantallas
// distintas), así que vive en localStorage igual que kdsScreenConfig y
// printerConfigService, y no en la configuración compartida del restaurante.

import printingService from './printingService';

const STORAGE_KEY = 'customerDisplayConfig';

const DEFAULTS = {
  targetUserId: '',
  targetName: '',
};

const isObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

export const normalizeCustomerDisplayConfig = (raw = {}) => {
  const targetUserId = isObjectId(raw?.targetUserId) ? raw.targetUserId : DEFAULTS.targetUserId;
  return {
    targetUserId,
    targetName: targetUserId ? String(raw?.targetName ?? '').trim().slice(0, 60) : DEFAULTS.targetName,
  };
};

export const readCustomerDisplayConfig = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeCustomerDisplayConfig(stored ? JSON.parse(stored) : DEFAULTS);
  } catch {
    // JSON corrupto o almacenamiento bloqueado: sin pantalla vinculada.
    return normalizeCustomerDisplayConfig(DEFAULTS);
  }
};

export const saveCustomerDisplayConfig = (config) => {
  const normalized = normalizeCustomerDisplayConfig(config);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Sin almacenamiento (incógnito, cuota llena): vale solo para esta sesión.
  }
  return normalized;
};

export const buildCustomerDisplayUrl = (baseUrl) => `${baseUrl || window.location.origin}/pantalla-cliente`;

// Instalador (.bat) para el PC del mostrador con doble monitor. Crea un acceso
// directo "Pantalla Cliente" en el Escritorio y en el Inicio de Windows que abre
// Chrome en modo kiosco directamente en el SEGUNDO monitor (detecta su posición
// al instalar). El perfil propio (--user-data-dir) es lo que permite iniciar
// sesión con el usuario carrito sin cerrar la sesión del punto de venta.
// Mismo enfoque que el instalador del acceso a Cocina en Configuración.
export const buildCustomerDisplayShortcutBat = (displayUrl) => `@echo off
setlocal

rem Crea un acceso directo "Pantalla Cliente" que abre Chrome en modo kiosco
rem en el segundo monitor, con un perfil de Chrome separado para iniciar
rem sesion con el usuario Carrito sin afectar al punto de venta.

set "DISPLAY_URL=${displayUrl}"
set "PROFILE_DIR=%LocalAppData%\\OrdenPlus\\PantallaCliente"

set "CHROME_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if not exist "%CHROME_PATH%" (
    echo No se encontro Google Chrome instalado en este equipo.
    echo Instala Chrome y vuelve a ejecutar este script.
    pause
    exit /b 1
)

for %%I in ("%CHROME_PATH%") do set "CHROME_DIR=%%~dpI"

rem Posicion del segundo monitor: el primero que no sea el principal.
rem (+50 px para quedar dentro del monitor aunque Windows use otra escala)
set "POS_X=0"
set "POS_Y=0"
set "SECOND_MONITOR=0"
for /f "tokens=1,2" %%a in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $m = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1; if ($m) { [string]::Join([char]32, @(($m.Bounds.X + 50), ($m.Bounds.Y + 50))) }"') do (
    set "POS_X=%%a"
    set "POS_Y=%%b"
    set "SECOND_MONITOR=1"
)

if "%SECOND_MONITOR%"=="0" (
    echo.
    echo ATENCION: no se detecto un segundo monitor conectado.
    echo El acceso directo abrira la pantalla en el monitor principal.
    echo Conecta el segundo monitor y vuelve a ejecutar este instalador.
    echo.
)

set "ARGS=--kiosk --no-first-run --window-position=%POS_X%,%POS_Y% --user-data-dir=\\"%PROFILE_DIR%\\" \\"%DISPLAY_URL%\\""
set "DESKTOP_SHORTCUT=%USERPROFILE%\\Desktop\\Pantalla Cliente.lnk"
set "STARTUP_SHORTCUT=%AppData%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Pantalla Cliente.lnk"

for %%S in ("%DESKTOP_SHORTCUT%" "%STARTUP_SHORTCUT%") do (
    powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%%~S'); $s.TargetPath='%CHROME_PATH%'; $s.Arguments='%ARGS%'; $s.IconLocation='%CHROME_PATH%,0'; $s.WorkingDirectory='%CHROME_DIR%'; $s.Save()"
)

if exist "%DESKTOP_SHORTCUT%" (
    echo Listo. Se creo el acceso directo "Pantalla Cliente" en el Escritorio
    echo y se agrego al Inicio de Windows para que abra al encender el equipo.
    echo La primera vez inicia sesion con el usuario Carrito de esta pantalla.
) else (
    echo Ocurrio un error al crear el acceso directo.
)

pause
`;

// Mismo cálculo que calculateTotal de Mostrador: el precio de cada extra se
// multiplica por la cantidad del producto.
const getLineTotal = (item) => {
  const quantity = Number(item.quantity) || 0;
  const extrasPerUnit = (item.selectedExtras || []).reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
  return ((Number(item.price) || 0) + extrasPerUnit) * quantity;
};

// selectedExtras trae una entrada por unidad del extra: se agrupan por nombre
// para mostrar "2× Queso" en vez de repetir la línea.
const groupExtras = (selectedExtras = []) => {
  const grouped = new Map();
  selectedExtras.forEach((extra) => {
    const name = extra.extraName || 'Extra';
    const current = grouped.get(name) || { name, quantity: 0, price: Number(extra.price) || 0 };
    current.quantity += 1;
    grouped.set(name, current);
  });
  return Array.from(grouped.values());
};

// Snapshot completo que recibe la pantalla. No incluye métodos de pago ni montos
// pagados: al cliente solo le corresponde ver qué pidió y cuánto es.
export const buildCustomerDisplayState = ({ status, cart = [], tip = 0, customerName = '', orderNumber = null }) => {
  if (status === 'idle') {
    return { status: 'idle', items: [] };
  }

  const items = cart.map((item) => ({
    key: String(item.cartId || item.id),
    name: item.name,
    quantity: Number(item.quantity) || 0,
    extras: groupExtras(item.selectedExtras),
    comment: item.comments || '',
    lineTotal: getLineTotal(item),
  }));

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const effectiveTip = printingService.getAllowTipOnCounterSale() ? (Number(tip) || 0) : 0;

  return {
    status,
    customerName: String(customerName || '').trim().slice(0, 60),
    orderNumber,
    items,
    subtotal,
    tip: effectiveTip,
    total: subtotal + effectiveTip,
  };
};
