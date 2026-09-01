// Configuración por pantalla del KDS: el TV de cocina, la tablet de parrilla y
// la de fríos comparten la misma URL (/cocina) pero necesitan mostrar cosas
// distintas. Cada dispositivo guarda su propia configuración en localStorage y
// esa copia es la fuente de verdad en cada arranque.
//
// Los parámetros de URL solo SIEMBRAN la configuración la primera vez y luego se
// limpian de la barra de direcciones. No se puede depender solo de la URL:
// ProtectedRoute y DefaultRedirect (App.js) usan <Navigate to="/cocina" replace />,
// que descarta el query string, así que cualquier expiración de sesión dejaría la
// pantalla sin configurar y en silencio — el mismo modo de falla que se buscaba
// evitar. Mismo criterio que printerConfigService: configuración por dispositivo.

const STORAGE_KEY = 'kdsScreenConfig';

export const KDS_MODES = {
  TV: 'tv',
  STATION: 'estacion',
};

// Los valores internos siguen siendo 'tv' y 'estacion' para no invalidar las
// configuraciones ya guardadas en los equipos, pero los nombres visibles
// describen lo que hace el layout y no en qué aparato se usa: el modo por
// páginas sirve igual de bien en un televisor que en una tablet.
export const KDS_MODE_LABELS = {
  [KDS_MODES.TV]: 'Páginas',
  [KDS_MODES.STATION]: 'Lista',
};

export const KDS_MODE_DESCRIPTIONS = {
  [KDS_MODES.TV]: 'Reparte los pedidos en páginas. Sin scroll, nada queda fuera de alcance.',
  [KDS_MODES.STATION]: 'Una sola lista continua, se recorre con scroll.',
};

export const KDS_LIMITS = {
  columnWidth: { min: 220, max: 560 },
  scale: { min: 0.7, max: 2 },
  rotateSeconds: { min: 4, max: 120 },
};

const VALID_SECTIONS = ['all', 'mesas', 'mostrador', 'delivery'];

const DEFAULTS = {
  mode: KDS_MODES.STATION,
  screenName: '',
  section: 'all',
  categoryIds: [],
  columnWidth: 320,
  scale: 1,
  sound: true,
  rotateSeconds: 12,
  autoRotate: true,
  interactive: true,
};

// A propósito no hay valores que se apliquen solos al cambiar de modo: el modo
// define únicamente el LAYOUT (páginas sin scroll vs lista con scroll). El
// sonido, la interacción y el tamaño son preferencias de quien configura la
// pantalla y no tienen por qué cambiar a sus espaldas por elegir otro layout.

// Nombres en español para que la URL sea legible al configurar un equipo a mano.
const URL_PARAMS = {
  modo: 'mode',
  nombre: 'screenName',
  seccion: 'section',
  categorias: 'categoryIds',
  ancho: 'columnWidth',
  escala: 'scale',
  sonido: 'sound',
  rotacion: 'rotateSeconds',
  autorotar: 'autoRotate',
  tactil: 'interactive',
};

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

const toBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const toNumber = (value, fallback, limits) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, limits);
};

const toCategoryIds = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(list.map((id) => String(id).trim()).filter(Boolean))];
};

export const normalizeKdsConfig = (raw = {}) => ({
  mode: Object.values(KDS_MODES).includes(raw.mode) ? raw.mode : DEFAULTS.mode,
  screenName: String(raw.screenName ?? DEFAULTS.screenName).trim().slice(0, 40),
  section: VALID_SECTIONS.includes(raw.section) ? raw.section : DEFAULTS.section,
  categoryIds: toCategoryIds(raw.categoryIds ?? DEFAULTS.categoryIds),
  columnWidth: toNumber(raw.columnWidth, DEFAULTS.columnWidth, KDS_LIMITS.columnWidth),
  scale: toNumber(raw.scale, DEFAULTS.scale, KDS_LIMITS.scale),
  sound: toBoolean(raw.sound, DEFAULTS.sound),
  rotateSeconds: toNumber(raw.rotateSeconds, DEFAULTS.rotateSeconds, KDS_LIMITS.rotateSeconds),
  autoRotate: toBoolean(raw.autoRotate, DEFAULTS.autoRotate),
  interactive: toBoolean(raw.interactive, DEFAULTS.interactive),
});

export const readStoredKdsConfig = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return normalizeKdsConfig(JSON.parse(stored));
  } catch {
    // JSON corrupto o almacenamiento bloqueado: se cae a los valores por defecto.
    return null;
  }
};

export const saveKdsConfig = (config) => {
  const normalized = normalizeKdsConfig(config);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Sin almacenamiento (incógnito, cuota llena): la configuración sigue viva
    // en memoria durante esta sesión, solo no sobrevive al próximo arranque.
  }
  return normalized;
};

export const clearStoredKdsConfig = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
  return normalizeKdsConfig(DEFAULTS);
};

// Devuelve solo los campos presentes en la URL, o null si no viene ninguno.
export const readUrlKdsConfig = (search = window.location.search) => {
  const params = new URLSearchParams(search);
  const patch = {};

  Object.entries(URL_PARAMS).forEach(([param, key]) => {
    if (params.has(param)) patch[key] = params.get(param);
  });

  return Object.keys(patch).length > 0 ? patch : null;
};

// Punto de entrada de la pantalla: la URL siembra, localStorage manda.
export const initKdsScreenConfig = () => {
  const stored = readStoredKdsConfig();
  const fromUrl = readUrlKdsConfig();

  if (!fromUrl) return stored || normalizeKdsConfig(DEFAULTS);

  const config = saveKdsConfig({ ...(stored || DEFAULTS), ...fromUrl });

  // La URL ya cumplió su función. Se limpia para que un re-login (que descarta
  // el query string) no se vea como un cambio de configuración, y para que nadie
  // crea que esos parámetros siguen mandando.
  try {
    const url = new URL(window.location.href);
    Object.keys(URL_PARAMS).forEach((param) => url.searchParams.delete(param));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // history bloqueado: no es crítico, la configuración ya quedó guardada.
  }

  return config;
};

// URL lista para pegar en otro dispositivo (o en el acceso directo del kiosco)
// y dejarlo configurado igual sin tocar nada a mano.
export const buildKdsScreenUrl = (config, baseUrl) => {
  const normalized = normalizeKdsConfig(config);
  const base = baseUrl || `${window.location.origin}/cocina`;
  const params = new URLSearchParams();

  params.set('modo', normalized.mode);
  if (normalized.screenName) params.set('nombre', normalized.screenName);
  params.set('seccion', normalized.section);
  if (normalized.categoryIds.length > 0) params.set('categorias', normalized.categoryIds.join(','));
  params.set('ancho', String(normalized.columnWidth));
  params.set('escala', String(normalized.scale));
  params.set('sonido', normalized.sound ? '1' : '0');
  params.set('tactil', normalized.interactive ? '1' : '0');
  if (normalized.mode === KDS_MODES.TV) {
    params.set('autorotar', normalized.autoRotate ? '1' : '0');
    if (normalized.autoRotate) params.set('rotacion', String(normalized.rotateSeconds));
  }

  return `${base}?${params.toString()}`;
};
