// Utilidades para manejo de fechas en zona horaria de Chile para el backend
const chileTimeZone = 'America/Santiago';

// Obtener fecha actual de Chile
const getChileDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: chileTimeZone }));
};

// Obtener timestamp de Chile para guardar en base de datos
const getChileTimestamp = () => {
  return getChileDate().toISOString();
};

// Formatear fecha para mostrar en zona horaria de Chile
const formatChileDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
  const targetDate = date ? new Date(date) : getChileDate();
  const chileDate = new Date(targetDate.toLocaleString("en-US", { timeZone: chileTimeZone }));
  chileDate.setHours(0, 0, 0, 0);
  return chileDate;
};

// Obtener fecha de fin del día en Chile
const getChileEndOfDay = (date = null) => {
  const targetDate = date ? new Date(date) : getChileDate();
  const chileDate = new Date(targetDate.toLocaleString("en-US", { timeZone: chileTimeZone }));
  chileDate.setHours(23, 59, 59, 999);
  return chileDate;
};

// Verificar si una fecha está en el día actual de Chile
const isToday = (date) => {
  const today = getChileDate();
  const checkDate = new Date(date.toLocaleString("en-US", { timeZone: chileTimeZone }));
  
  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
};

// Obtener rango de fechas para filtros (desde inicio del día hasta fin del día en Chile)
const getChileDayRange = (dateString) => {
  const date = new Date(dateString);
  
  return {
    start: getChileStartOfDay(date),
    end: getChileEndOfDay(date)
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