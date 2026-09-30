// Tiempos del kiosco de autoservicio. Se centralizan aquí para poder ajustarlos sin tocar
// la lógica de las pantallas.

/** Inactividad antes de preguntar "¿Sigues ahí?" mientras el cliente arma su pedido. */
export const IDLE_MS = 90 * 1000;

/** Cuenta regresiva del aviso de inactividad antes de descartar el carrito. */
export const IDLE_WARNING_MS = 10 * 1000;

/** Cada cuánto el kiosco consulta si cambió el menú o el estado de la caja. */
export const STATUS_POLL_MS = 30 * 1000;

/** Tiempo que se muestra el número de pedido antes de volver a la pantalla de atracción. */
export const CONFIRM_AUTORESET_MS = 15 * 1000;

/** Máximo de unidades por línea; debe coincidir con MAX_LINE_QUANTITY del backend. */
export const MAX_LINE_QUANTITY = 20;

/** Máximo de caracteres del nombre del cliente; debe coincidir con el backend. */
export const MAX_CUSTOMER_NAME_LENGTH = 40;

/** Máximo de caracteres del comentario; debe coincidir con el backend. */
export const MAX_COMMENT_LENGTH = 200;

/** Cada cuánto el kiosco consulta el estado del cobro con tarjeta mientras el cliente paga. */
export const PAYMENT_POLL_MS = 3 * 1000;

/**
 * Tras este tiempo sin resolverse el cobro, solo se avisa en pantalla. El kiosco NO vuelve
 * solo al inicio ni el cliente puede cancelar desde ahí: Haulmer no expone una API para
 * cancelar remotamente, así que la única salida real es cancelar el cobro en el propio POS.
 * La pantalla espera indefinidamente hasta que el POS resuelva (aprobado, rechazado o
 * cancelado ahí).
 */
export const PAYMENT_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Mientras el kiosco está en la pantalla de inicio, cada cuánto revisa en segundo plano si
 * algún cobro con tarjeta quedó aprobado sin pedido (p. ej. la tablet se reinició a mitad de
 * un pago), para crear su pedido sin que nadie tenga que volver a tocar la pantalla.
 */
export const PAYMENT_RECOVERY_POLL_MS = 20 * 1000;

/** Clave de localStorage con el cobro en curso, para retomarlo si la tablet se reinicia. */
export const PAYMENT_SESSION_STORAGE_KEY = 'selfService:paymentSessionId';
