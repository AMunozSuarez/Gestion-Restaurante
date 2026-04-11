// Utilidades para manejo de fechas en zona horaria de Chile para el backend
const chileTimeZone = 'America/Santiago';
const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value) => String(value).padStart(2, '0');

const getChileDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: chileTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const getPart = (type) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day')
  };
};

const buildDateKey = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const parseDateKey = (dateKey) => {
  const match = String(dateKey || '').match(DATE_KEY_REGEX);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
};

const getChileDateKey = (date = new Date()) => {
  const { year, month, day } = getChileDateParts(date);
  return buildDateKey(year, month, day);
};

const addDaysToDateKey = (dateKey, days) => {
  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return null;
  }

  const nextDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return buildDateKey(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate());
};

const findChileDayStartUtcMs = (dateKey) => {
  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return null;
  }

  let low = Date.UTC(parsed.year, parsed.month - 1, parsed.day) - (2 * DAY_MS);
  let high = Date.UTC(parsed.year, parsed.month - 1, parsed.day) + (2 * DAY_MS);

  for (let i = 0; i < 60 && high - low > 1; i += 1) {
    const mid = Math.floor((low + high) / 2);
    const midKey = getChileDateKey(new Date(mid));

    if (midKey < dateKey) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return getChileDateKey(new Date(high)) === dateKey ? high : null;
};

// Obtener fecha actual de Chile
const getChileDate = () => {
  return new Date();
};

// Obtener timestamp de Chile para guardar en base de datos
const getChileTimestamp = () => {
  return new Date().toISOString();
};

// Formatear fecha para mostrar en zona horaria de Chile
const formatChileDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return null;
  }

  return dateObj.toLocaleString('es-CL', {
    timeZone: chileTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Obtener fecha de inicio del día en Chile
const getChileStartOfDay = (date = null) => {
  const targetDate = date ? new Date(date) : new Date();

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const dateKey = getChileDateKey(targetDate);
  const startMs = findChileDayStartUtcMs(dateKey);
  return startMs === null ? null : new Date(startMs);
};

// Obtener fecha de fin del día en Chile
const getChileEndOfDay = (date = null) => {
  const targetDate = date ? new Date(date) : new Date();

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const dateKey = getChileDateKey(targetDate);
  const nextDateKey = addDaysToDateKey(dateKey, 1);

  if (!nextDateKey) {
    return null;
  }

  const nextDayStartMs = findChileDayStartUtcMs(nextDateKey);
  return nextDayStartMs === null ? null : new Date(nextDayStartMs - 1);
};

// Verificar si una fecha está en el día actual de Chile
const isToday = (date) => {
  const checkDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(checkDate.getTime())) {
    return false;
  }

  return getChileDateKey(new Date()) === getChileDateKey(checkDate);
};

// Obtener rango de fechas para filtros (desde inicio del día hasta fin del día en Chile)
const getChileDayRange = (dateString) => {
  const parsed = parseDateKey(dateString);

  if (!parsed) {
    return null;
  }

  const dateKey = buildDateKey(parsed.year, parsed.month, parsed.day);
  const nextDateKey = addDaysToDateKey(dateKey, 1);

  if (!nextDateKey) {
    return null;
  }

  const startMs = findChileDayStartUtcMs(dateKey);
  const nextDayStartMs = findChileDayStartUtcMs(nextDateKey);

  if (startMs === null || nextDayStartMs === null) {
    console.error('Error: fechas inválidas generadas');
    return null;
  }

  return {
    start: new Date(startMs),
    end: new Date(nextDayStartMs - 1)
  };
};

module.exports = {
  chileTimeZone,
  getChileDate,
  getChileTimestamp,
  formatChileDate,
  getChileStartOfDay,
  getChileEndOfDay,
  isToday,
  getChileDayRange
};