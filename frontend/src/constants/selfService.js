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
