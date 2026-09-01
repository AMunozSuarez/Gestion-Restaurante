import React from 'react';
import { Badge } from '../ui';
import { normalizeKitchenItems } from '../../utils/kitchenOrderNormalize';
import {
  SECTION_LABELS,
  getElapsedMinutes,
  getOrderId,
  getOrderLabel,
  getUrgencyVariant,
  getVisibleKitchenItems,
  orderNeedsReconfirmation,
} from '../../utils/kdsShared';

const KitchenOrderCard = ({
  order,
  now,
  onMarkReady,
  onToggleItemReady,
  checklistMode,
  canMarkReady,
  selectedCategoryIds,
  viewContext,
  // Una pantalla de solo mostrar exhibe el estado pero no ofrece nada que tocar.
  interactive = true,
  // Pedido largo repartido en varias tarjetas: `itemsOverride` es el trozo que
  // le toca a ésta y `part` dice cuál de cuántas es.
  itemsOverride = null,
  part = null,
  className = '',
}) => {
  const orderId = getOrderId(order);
  const elapsedMinutes = getElapsedMinutes(order, now);
  const urgencyVariant = getUrgencyVariant(elapsedMinutes);
  const allItems = normalizeKitchenItems(order);

  const stationFilterActive = Boolean(selectedCategoryIds && selectedCategoryIds.size > 0);
  // Solo se muestran los productos de las categorías filtradas: en la tablet de
  // parrilla no tiene por qué aparecer un postre.
  const stationItems = stationFilterActive
    ? allItems.filter((item) => item.categoryId && selectedCategoryIds.has(String(item.categoryId)))
    : allItems;

  const orderReadyFlag = Boolean(order.kitchenReadyAt);

  // Dos conteos distintos, ambos necesarios:
  // - el del pedido completo decide si se puede confirmar "Listo", porque
  //   kitchenReadyAt es del pedido y no de una estación;
  // - el de la estación es lo único que el cocinero puede completar desde ESTA
  //   pantalla, y es lo que necesita ver para saber si ya terminó su parte.
  const readyItemsCount = allItems.filter((item) => item.ready).length;
  const allItemsReady = allItems.length > 0 && readyItemsCount === allItems.length;
  const stationReadyCount = stationItems.filter((item) => item.ready).length;
  const stationAllReady = stationItems.length > 0 && stationReadyCount === stationItems.length;
  // La estación terminó lo suyo pero el pedido todavía tiene pendientes de otra:
  // el pedido lo cierra la última estación en terminar.
  const waitingOtherStations = stationFilterActive && stationAllReady && !allItemsReady;

  // Se agregó un producto después de marcar el pedido como listo: el pedido se
  // divide en dos vistas — la de "Listos" solo con lo ya preparado, y la de
  // "En preparación" solo con lo nuevo. Sigue "mixto" (pendiente de reconfirmar)
  // hasta que alguien presiona "Confirmar Listo", aunque ya se hayan marcado
  // todos los productos nuevos en el checklist.
  const isMixed = checklistMode && orderNeedsReconfirmation(order);

  // La vista determina cómo se muestra la tarjeta, no solo el estado guardado:
  // un pedido mixto aparece en ambas listas con contenido y estilo distintos.
  const isReady = viewContext === 'ready' ? true : viewContext === 'active' ? false : orderReadyFlag;
  const items = itemsOverride || getVisibleKitchenItems({
    order,
    items: allItems,
    categoryIds: selectedCategoryIds,
    viewContext,
    checklistMode,
  });

  // El resumen y el botón de confirmar son del pedido completo, así que van solo
  // en la última parte: repetirlos en cada trozo haría creer que cada uno se
  // confirma por separado.
  const isLastPart = !part || part.index === part.total;

  const markReadyDisabledReason = !canMarkReady
    ? 'Solo el dueño puede confirmar el pedido como listo'
    : checklistMode && !allItemsReady
      ? waitingOtherStations
        ? 'Tu estación ya terminó. Falta que otra estación marque sus productos.'
        : 'Faltan productos por marcar'
      : undefined;

  return (
    <div
      className={`rounded-xl border-2 p-4 flex flex-col gap-3 ${
        isReady
          ? 'bg-green-900 border-green-400 shadow-lg shadow-green-900/50'
          : isMixed
            ? 'bg-gray-800 border-amber-400 shadow-lg shadow-amber-900/30'
            : 'bg-gray-800 border-gray-700'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="text-xl font-bold">
          #{order.orderNumber}
          {part && (
            <span className="ml-2 px-2 py-0.5 rounded-md align-middle text-sm font-bold bg-amber-500 text-gray-900">
              parte {part.index}/{part.total}
            </span>
          )}
        </span>
        {isReady ? (
          <Badge variant="success" size="lg" className="whitespace-nowrap">✓ Listo</Badge>
        ) : (
          // Sin flex-wrap y sin el ícono: la adición y el tiempo van siempre en
          // la misma línea, uno al lado del otro. En una tarjeta angosta baja el
          // grupo entero debajo del número, pero nunca se parte en dos filas.
          <div className="flex items-center gap-1.5 justify-end">
            {isMixed && (
              <Badge
                variant="secondary"
                size="md"
                className="whitespace-nowrap"
                title="Este pedido ya tenía productos listos; se le agregó uno nuevo"
              >
                Adición
              </Badge>
            )}
            <Badge variant={urgencyVariant} size="lg" className="whitespace-nowrap">
              {Math.max(0, Math.floor(elapsedMinutes))} min
            </Badge>
          </div>
        )}
      </div>

      <div className={`text-sm ${isReady ? 'text-green-200' : 'text-gray-300'}`}>
        <div>{SECTION_LABELS[order.section] || order.section}</div>
        <div className="font-medium text-white">{getOrderLabel(order)}</div>
      </div>

      {checklistMode ? (
        <ul className="space-y-1.5 text-lg">
          {items.map((item, idx) => (
            <li key={item.id || idx}>
              <button
                type="button"
                onClick={() => onToggleItemReady(orderId, item.id, !item.ready)}
                disabled={!item.id || !interactive}
                className={`w-full flex items-start gap-2 text-left px-2 rounded-lg transition-colors ${
                  // Táctil: la fila se agranda para poder marcarla con el dedo,
                  // que es el gesto más repetido del turno. Solo mostrar: se
                  // deja compacta, porque ahí lo que importa es que entren más
                  // pedidos en pantalla y nadie la va a tocar.
                  interactive ? 'py-3 touch-manipulation' : 'py-1.5'
                } ${item.ready ? 'bg-green-950/60' : 'bg-gray-900/40'} ${
                  interactive ? 'hover:bg-gray-900/70' : 'cursor-default'
                }`}
              >
                <span
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-sm ${
                    item.ready ? 'bg-green-500 border-green-500 text-gray-900' : 'border-gray-500 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className={item.ready ? 'line-through text-green-300' : ''}>
                  <span className="font-semibold">{item.quantity}x</span> {item.productName}
                  {item.notes && (
                    <div className="text-sm pl-1 text-amber-300 no-underline">— {item.notes}</div>
                  )}
                  {item.selectedExtras.length > 0 && (
                    <div className="text-sm pl-1 text-gray-400 no-underline">
                      {item.selectedExtras.map((extra) => extra.extraName).join(', ')}
                    </div>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1 text-lg">
          {items.map((item, idx) => (
            <li key={idx}>
              <span className="font-semibold">{item.quantity}x</span> {item.productName}
              {item.notes && (
                <div className={`text-sm pl-4 ${isReady ? 'text-green-200' : 'text-amber-300'}`}>— {item.notes}</div>
              )}
              {item.selectedExtras.length > 0 && (
                <div className={`text-sm pl-4 ${isReady ? 'text-green-300' : 'text-gray-400'}`}>
                  {item.selectedExtras.map((extra) => extra.extraName).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {order.comment && (
        <div className={`text-sm border-t pt-2 ${isReady ? 'text-green-200 border-green-700' : 'text-amber-300 border-gray-700'}`}>
          {order.comment}
        </div>
      )}

      {part && !isLastPart && (
        <div className="mt-1 pt-2 border-t border-gray-700 text-center text-sm font-bold text-amber-300">
          Sigue en la parte {part.index + 1} →
        </div>
      )}

      {checklistMode && isLastPart && (
        <div
          className={`mt-2 py-1.5 px-2 rounded-lg text-center text-sm font-bold ${
            waitingOtherStations
              ? 'bg-amber-950 text-amber-300'
              : (stationFilterActive ? stationAllReady : allItemsReady)
                ? 'bg-green-950 text-green-300'
                : 'bg-gray-900 text-gray-400'
          }`}
        >
          {stationFilterActive ? (
            waitingOtherStations ? (
              <>✓ Tu estación lista · faltan otras ({readyItemsCount}/{allItems.length})</>
            ) : (
              <>Tu estación: {stationReadyCount}/{stationItems.length} listos</>
            )
          ) : allItemsReady ? (
            <>✓ Todos los productos listos</>
          ) : (
            <>{readyItemsCount}/{allItems.length} productos listos</>
          )}
        </div>
      )}

      {interactive && isLastPart && (
        <button
          onClick={() => onMarkReady(orderId)}
          disabled={isReady || !canMarkReady || (checklistMode && !allItemsReady)}
          title={markReadyDisabledReason}
          className={`${checklistMode ? '' : 'mt-2 '}py-4 rounded-lg text-lg font-bold transition-colors touch-manipulation ${
            isReady
              ? 'bg-green-950 text-green-300 cursor-default'
              : canMarkReady && (!checklistMode || allItemsReady)
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isReady ? 'Listo' : checklistMode ? 'Confirmar Listo' : 'Marcar Listo'}
        </button>
      )}
    </div>
  );
};

export default KitchenOrderCard;
