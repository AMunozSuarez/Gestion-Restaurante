// Constantes y helpers compartidos de la pantalla de cocina. Viven fuera de
// KitchenDisplay para que las tarjetas, el tablero paginado y el panel de
// configuración no tengan que importar la página completa.

// Umbrales del semáforo (minutos desde la creación del pedido). Ajustar aquí si
// se necesita otro ritmo de cocina.
export const KDS_WARNING_MINUTES = 10;
export const KDS_OVERDUE_MINUTES = 20;
export const KDS_TICK_MS = 15 * 1000;
// Resincronización periódica contra el servidor: red de seguridad para eventos
// perdidos (caída de socket, pedido eliminado o mesa cerrada desde otro equipo).
export const KDS_RESYNC_MS = 60 * 1000;
// Vida máxima de una guarda optimista. Sin este límite, una guarda que el
// servidor nunca confirma dejaría un "listo" congelado para siempre.
export const PENDING_GUARD_TTL_MS = 20 * 1000;

export const SECTION_LABELS = {
  mesas: 'Mesas',
  mostrador: 'Mostrador',
  delivery: 'Delivery',
};

export const SECTION_FILTERS = ['all', 'mesas', 'mostrador', 'delivery'];

export const getOrderId = (order) => order._id || order.id;

export const isKitchenOrder = (order) =>
  Boolean(order) && order.status === 'Preparacion' && Array.isArray(order.foods) && order.foods.length > 0;

// El pedido sigue esperando una reconfirmación manual mientras la última edición
// (kitchenActivityAt) sea más reciente que la última vez que se confirmó como listo
// (kitchenReadyAt). Marcar los productos nuevos en el checklist NO limpia esto por
// sí solo — solo el botón "Confirmar Listo" actualiza kitchenReadyAt.
export const orderNeedsReconfirmation = (order) =>
  Boolean(order.kitchenReadyAt) &&
  Boolean(order.kitchenActivityAt) &&
  new Date(order.kitchenActivityAt).getTime() > new Date(order.kitchenReadyAt).getTime();

// kitchenActivityAt se reinicia cuando se agregan productos a una orden que ya
// estaba lista, para que vuelva a mostrarse como recién ingresada.
export const getKitchenTimeReference = (order) =>
  new Date(order.kitchenActivityAt || order.createdAt).getTime();

export const getElapsedMinutes = (order, now) => (now - getKitchenTimeReference(order)) / 60000;

export const getUrgencyVariant = (elapsedMinutes) => {
  if (elapsedMinutes >= KDS_OVERDUE_MINUTES) return 'danger';
  if (elapsedMinutes >= KDS_WARNING_MINUTES) return 'secondary'; // naranjo
  return 'success';
};

export const getOrderLabel = (order) => {
  if (order.section === 'mesas') {
    const table = order.tableNumber ? `Mesa ${order.tableNumber}` : 'Mesa s/n';
    const waiterName = order.waiter?.userName || order.waiter?.name || '';
    return waiterName ? `${table} · ${waiterName}` : table;
  }
  if (order.section === 'delivery') {
    return order.selectedAddress || order.buyer?.name || order.name || 'Delivery';
  }
  return order.buyer?.name || order.name || 'Mostrador';
};

export const getItemCategoryId = (item) => {
  const category = item.food?.category;
  return (category && (category._id || category)) || null;
};

// Un pedido entra a una pantalla filtrada si tiene AL MENOS un producto de las
// categorías elegidas: la estación de parrilla debe ver el pedido aunque también
// lleve productos fríos.
export const orderMatchesCategories = (order, categoryIds) => {
  if (categoryIds.size === 0) return true;
  if (!Array.isArray(order.foods)) return false;
  return order.foods.some((item) => {
    const categoryId = getItemCategoryId(item);
    return categoryId && categoryIds.has(String(categoryId));
  });
};

// Reparte los productos de un pedido según el filtro de categorías de la pantalla
// y la vista en la que se muestra. Es exactamente la partición que pinta la
// tarjeta, expuesta aparte para que la página pueda descartar antes las tarjetas
// que quedarían vacías. Pasa en dos casos reales:
//  - a un pedido ya listo le agregan un postre y esta es la pantalla de parrilla:
//    no tiene nada nuevo que preparar, no debe aparecerle en "en preparación";
//  - la edición del pedido solo borró productos: kitchenActivityAt se movió pero
//    no hay ningún producto nuevo que cocinar.
export const getVisibleKitchenItems = ({ order, items, categoryIds, viewContext, checklistMode }) => {
  const stationItems = categoryIds && categoryIds.size > 0
    ? items.filter((item) => item.categoryId && categoryIds.has(String(item.categoryId)))
    : items;

  if (!checklistMode || !orderNeedsReconfirmation(order)) return stationItems;

  // Un producto es "nuevo" si se agregó después de la última vez que se confirmó
  // el pedido como listo — a diferencia de `ready`, esto no cambia al marcarlo en
  // el checklist, así que sigue apareciendo solo en "En preparación" hasta que se
  // presione "Confirmar Listo".
  const readyAt = new Date(order.kitchenReadyAt).getTime();
  const isNewItem = (item) => Boolean(item.addedAt) && new Date(item.addedAt).getTime() > readyAt;

  if (viewContext === 'ready') return stationItems.filter((item) => !isNewItem(item));
  if (viewContext === 'active') return stationItems.filter(isNewItem);
  return stationItems;
};

// En el tablero paginado, una tarjeta más alta que la columna la parte el
// navegador por su cuenta, y el trozo que cae en la columna siguiente queda sin
// encabezado: se ve una lista de productos y un "6/14 productos listos" sueltos,
// sin número de pedido ni mesa. Por eso los pedidos largos se reparten antes, en
// tarjetas numeradas ("parte 1 de 2") que sí caben enteras.
//
// Cuántos productos caben en una columna NO se puede estimar: depende del alto
// real de la pantalla, del ancho de tarjeta (que decide cuánto se corta el texto
// en varias líneas), de las notas y de los extras de cada producto. Cualquier
// número fijo falla en alguna combinación. Por eso el reparto no se calcula: se
// mide. La pantalla renderiza, detecta qué tarjetas partió el navegador y las
// vuelve a repartir en una parte más, hasta que ninguna queda cortada.
// Tope de seguridad por si un solo producto ya no cabe en la columna: sin él el
// ciclo seguiría partiendo para siempre.
export const MAX_CARD_PARTS = 8;

// Una tarjeta que el navegador partió entre columnas devuelve un rectángulo por
// trozo; una entera devuelve uno solo. Es la señal directa del problema, sin
// tener que estimar alturas.
export const isFragmented = (node) => Boolean(node) && node.getClientRects().length > 1;

// Reparte los productos en `partCount` tarjetas de tamaño parejo. El sobrante se
// distribuye de a un producto entre las primeras, para que 22 productos en 3
// partes den 8+7+7 y no 8+8+6.
export const splitItemsIntoParts = (items, partCount) => {
  const parts = Math.max(1, Math.min(Math.round(partCount) || 1, items.length));
  if (parts <= 1) return [items];

  const base = Math.floor(items.length / parts);
  const remainder = items.length % parts;

  const result = [];
  let start = 0;
  for (let index = 0; index < parts; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    result.push(items.slice(start, start + size));
    start += size;
  }

  return result;
};

// Silencia repeticiones inmediatas. Cubre dos casos reales: React 19 en
// StrictMode invoca los efectos dos veces, y un pedido puede disparar varios
// eventos de socket seguidos. Sin esto se oye un doble pitido.
const SOUND_DEBOUNCE_MS = 400;
let lastSoundAt = 0;

export const playNewOrderSound = () => {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_DEBOUNCE_MS) return;
  lastSoundAt = now;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const start0 = ctx.currentTime;

    [880, 1320].forEach((freq, idx) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      const start = start0 + idx * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio no disponible; se ignora en silencio.
  }
};
