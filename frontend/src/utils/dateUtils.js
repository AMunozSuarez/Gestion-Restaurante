// Utilidades para manejo de fechas en zona horaria de Chile
export const chileTimeZone = 'America/Santiago';

// Obtener fecha actual de Chile en formato YYYY-MM-DD
export const getChileToday = () => {
  return new Date().toLocaleDateString('en-CA', { 
    timeZone: chileTimeZone 
  });
};

// Obtener fecha y hora actual de Chile
export const getChileNow = () => {
  return new Date().toLocaleString('es-CL', {
    timeZone: chileTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Formatear fecha para mostrar (solo fecha)
export const formatChileDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    timeZone: chileTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Formatear fecha y hora para mostrar
export const formatChileDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    timeZone: chileTimeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatear moneda chilena
export const formatChileanCurrency = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

// Obtener timestamp de Chile para el backend
export const getChileTimestamp = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: chileTimeZone
  });
};

// Verificar si una fecha está en el rango de hoy (Chile)
export const isToday = (dateString) => {
  const today = getChileToday();
  const dateOnly = new Date(dateString).toLocaleDateString('en-CA', {
    timeZone: chileTimeZone
  });
  return dateOnly === today;
};

// Obtener fecha de Chile con offset específico (días)
export const getChileDateWithOffset = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA', { 
    timeZone: chileTimeZone 
  });
};