/**
 * Utilidades para formateo de datos en formato chileno
 */

/**
 * Formatea un número en formato chileno (separadores de miles con punto, decimales con coma)
 * @param {number} number - Número a formatear
 * @param {number} decimals - Cantidad de decimales a mostrar (por defecto 0)
 * @return {string} - Número formateado en formato chileno
 */
export const formatChileanCurrency = (number, decimals = 0) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  return number
    .toFixed(decimals)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Formatea un número como moneda chilena (CLP)
 * @param {number} number - Monto a formatear
 * @param {number} decimals - Cantidad de decimales a mostrar (por defecto 0)
 * @return {string} - Monto formateado en formato chileno con símbolo de peso
 */
export const formatChileanMoney = (number, decimals = 0) => {
  return `$${formatChileanCurrency(number, decimals)}`;
};
