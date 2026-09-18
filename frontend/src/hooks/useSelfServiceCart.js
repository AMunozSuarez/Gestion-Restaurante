import { useState, useCallback, useMemo } from 'react';
import { calculateExtrasTotal, flattenSelectedExtras } from '../utils/extrasSelection';
import { MAX_LINE_QUANTITY } from '../constants/selfService';

/**
 * Carrito del kiosco.
 *
 * Cada línea es una configuración distinta del mismo producto: dos "Completo" con extras
 * diferentes son dos líneas. Los extras se guardan agrupados (con `quantity`) para poder
 * mostrarlos y editarlos; se aplanan al formato que espera el backend recién al enviar.
 *
 * Los precios que se guardan aquí son solo para mostrar: el backend recalcula el total con
 * los precios de la base de datos y rechaza cualquier extra cuyo precio no coincida.
 */

let lineIdSeed = 0;
const nextLineId = () => {
  lineIdSeed += 1;
  return `line-${Date.now()}-${lineIdSeed}`;
};

const useSelfServiceCart = () => {
  const [lines, setLines] = useState([]);

  const addLine = useCallback((product, selectedExtras = [], quantity = 1) => {
    setLines((prev) => [
      ...prev,
      {
        id: nextLineId(),
        productId: product._id,
        title: product.title,
        imageUrl: product.imageUrl,
        unitPrice: product.price || 0,
        selectedExtras, // agrupados: [{ sectionId, extraId, sectionName, extraName, price, quantity }]
        quantity: Math.min(Math.max(1, quantity), MAX_LINE_QUANTITY),
        unavailable: false,
        // Se guarda en la línea (no se deriva de selectedExtras.length) porque el cliente
        // puede elegir 0 extras opcionales y aun así debe poder volver a editar esa
        // configuración — no solo agregar líneas que ya traen algo seleccionado.
        hasExtraSections: Boolean(product.extraSections && product.extraSections.length > 0),
      },
    ]);
  }, []);

  const updateLine = useCallback((lineId, { selectedExtras, quantity }) => {
    setLines((prev) => prev.map((line) => (line.id === lineId
      ? {
        ...line,
        selectedExtras: selectedExtras ?? line.selectedExtras,
        quantity: quantity !== undefined
          ? Math.min(Math.max(1, quantity), MAX_LINE_QUANTITY)
          : line.quantity,
      }
      : line)));
  }, []);

  const setLineQuantity = useCallback((lineId, quantity) => {
    if (quantity < 1) {
      setLines((prev) => prev.filter((line) => line.id !== lineId));
      return;
    }
    setLines((prev) => prev.map((line) => (line.id === lineId
      ? { ...line, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
      : line)));
  }, []);

  const removeLine = useCallback((lineId) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  }, []);

  const resetCart = useCallback(() => setLines([]), []);

  /** Marca las líneas que el backend rechazó, para resaltarlas antes de quitarlas. */
  const markUnavailable = useCallback((foodIds = []) => {
    const ids = new Set(foodIds.map(String));
    setLines((prev) => prev.map((line) => ({ ...line, unavailable: ids.has(String(line.productId)) })));
  }, []);

  const removeUnavailable = useCallback(() => {
    setLines((prev) => prev.filter((line) => !line.unavailable));
  }, []);

  /**
   * Revalida el carrito contra un catálogo recién cargado: marca como no disponible todo lo
   * que ya no esté publicado. Permite avisar antes de que el cliente intente confirmar.
   */
  const revalidateAgainstProducts = useCallback((products = []) => {
    const available = new Set(products.map((product) => String(product._id)));
    let changed = false;

    setLines((prev) => {
      const next = prev.map((line) => {
        const stillAvailable = available.has(String(line.productId));
        if (line.unavailable === !stillAvailable) return line;
        changed = true;
        return { ...line, unavailable: !stillAvailable };
      });
      return changed ? next : prev;
    });
  }, []);

  const getLineTotal = useCallback((line) => {
    const extrasPerUnit = calculateExtrasTotal(line.selectedExtras);
    return (line.unitPrice + extrasPerUnit) * line.quantity;
  }, []);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (line.unitPrice + calculateExtrasTotal(line.selectedExtras)) * line.quantity, 0),
    [lines]
  );

  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  const hasUnavailable = useMemo(() => lines.some((line) => line.unavailable), [lines]);

  /** Payload para POST /self-service/order: una entrada por extra y unidad. */
  const buildOrderFoods = useCallback(() => lines.map((line) => ({
    food: line.productId,
    quantity: line.quantity,
    selectedExtras: flattenSelectedExtras(line.selectedExtras),
  })), [lines]);

  return {
    lines,
    total,
    itemCount,
    isEmpty: lines.length === 0,
    hasUnavailable,
    addLine,
    updateLine,
    setLineQuantity,
    removeLine,
    resetCart,
    markUnavailable,
    removeUnavailable,
    revalidateAgainstProducts,
    getLineTotal,
    buildOrderFoods,
  };
};

export default useSelfServiceCart;
