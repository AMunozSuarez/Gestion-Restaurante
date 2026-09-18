/**
 * Lógica pura de selección de extras, compartida entre el POS (ProductExtrasModal) y el
 * módulo de autoservicio (ProductConfigurator).
 *
 * Se extrajo verbatim de ProductExtrasModal.jsx para que el kiosco respete exactamente las
 * mismas reglas (maxSelection, visibleExtraIds, disponibilidad, match por id con fallback a
 * nombre) sin reimplementarlas. Estas funciones no tocan estado de React: reciben y
 * devuelven arrays, y el componente decide qué hacer con el resultado.
 */

/**
 * Clave de agrupación: por extraId cuando el pedido ya lo trae (estable ante un renombre
 * posterior), o por nombre para pedidos guardados antes de ese campo.
 */
export const buildExtraKey = (extra) =>
  (extra?.extraId ? `id:${extra.extraId}` : `name:${extra?.sectionName}|${extra?.extraName}`);

/**
 * Convierte la lista plana que viaja en el pedido (una entrada por unidad) en la lista
 * agrupada con `quantity` que usa la UI.
 */
export const normalizeInitialExtras = (extras = []) => {
  const extrasMap = new Map();

  extras.forEach((extra) => {
    if (!extra?.sectionName || !extra?.extraName) {
      return;
    }

    const key = buildExtraKey(extra);
    const quantity = extra.quantity && extra.quantity > 0 ? extra.quantity : 1;

    if (extrasMap.has(key)) {
      const existing = extrasMap.get(key);
      existing.quantity += quantity;
    } else {
      extrasMap.set(key, {
        sectionId: extra.sectionId || null,
        extraId: extra.extraId || null,
        sectionName: extra.sectionName,
        extraName: extra.extraName,
        price: extra.price || 0,
        quantity
      });
    }
  });

  return Array.from(extrasMap.values());
};

/**
 * Operación inversa: expande `quantity` a N entradas planas, que es el formato que espera
 * createOrderController en el backend.
 */
export const flattenSelectedExtras = (extras = []) => {
  return extras.flatMap((extra) => {
    const quantity = extra.quantity || 0;

    return Array.from({ length: quantity }, () => ({
      sectionId: extra.sectionId || null,
      extraId: extra.extraId || null,
      sectionName: extra.sectionName,
      extraName: extra.extraName,
      price: extra.price || 0
    }));
  });
};

/**
 * Normaliza cada asignación de sección del producto al formato que la UI necesita:
 * { sectionId, sectionName, maxSelection, extras[] }
 * Soporta tanto el formato actual ({ section: {...}, maxSelection, visibleExtraIds })
 * como el antiguo (objeto con sectionName y extras directos, pre-migración).
 */
export const getEffectiveSections = (product) => {
  if (!product?.extraSections) {
    return [];
  }

  return product.extraSections.map((assignment) => {
    // Formato nuevo: { section: { sectionName, extras }, maxSelection, visibleExtraIds }
    if (assignment.section && typeof assignment.section === 'object') {
      const sec = assignment.section;
      const effectiveMax = assignment.maxSelection ?? null;
      const visibleIds = assignment.visibleExtraIds || [];
      const allExtras = sec.extras || [];
      const extras = visibleIds.length > 0
        ? allExtras.filter(e => visibleIds.some(id => id.toString() === (e._id || e).toString()))
        : allExtras;
      return { sectionId: sec._id ? String(sec._id) : null, sectionName: sec.sectionName, maxSelection: effectiveMax, extras };
    }
    // Formato antiguo (pre-migración): el objeto tiene sectionName y extras directamente.
    // Si Mongoose ya aplicó el esquema nuevo sobre datos viejos, extras puede ser undefined.
    return {
      sectionId: null,
      sectionName: assignment.sectionName || '',
      maxSelection: assignment.maxSelection ?? null,
      extras: assignment.extras || [],
    };
  }).filter(s => s.sectionName); // descartar entradas sin nombre (datos aún no migrados)
};

// Compara una selección guardada contra una sección/extra en vivo: por id cuando ambos
// lados lo tienen (estable ante un renombre), por nombre si no.
export const matchesSection = (selected, section) => (selected.sectionId && section.sectionId
  ? String(selected.sectionId) === String(section.sectionId)
  : selected.sectionName === section.sectionName);

export const matchesExtra = (selected, section, extra) => (selected.extraId && extra._id
  ? String(selected.extraId) === String(extra._id)
  : matchesSection(selected, section) && selected.extraName === extra.name);

/** Unidades totales seleccionadas en una sección (no extras distintos). */
export const getSectionSelectedCount = (extrasState = [], section) => {
  return extrasState
    .filter(e => matchesSection(e, section))
    .reduce((sum, extra) => sum + (extra.quantity || 0), 0);
};

export const getExtraQuantity = (extrasState = [], section, extra) => {
  const selectedExtra = extrasState.find(e => matchesExtra(e, section, extra));

  return selectedExtra?.quantity || 0;
};

export const calculateExtrasTotal = (extrasState = []) => {
  return extrasState.reduce((sum, extra) => sum + ((extra.price || 0) * (extra.quantity || 0)), 0);
};

export const getTotalSelectedExtras = (extrasState = []) => {
  return extrasState.reduce((sum, extra) => sum + (extra.quantity || 0), 0);
};

export const buildSectionLimitMessage = (maxSelection) =>
  `Máximo ${maxSelection} ${maxSelection === 1 ? 'opción' : 'opciones'} permitida${maxSelection === 1 ? '' : 's'}`;

export const hasMaxSelection = (section) =>
  section?.maxSelection !== null && section?.maxSelection !== undefined;

/**
 * Suma una unidad del extra. Devuelve `{ extras, error }`: cuando la sección ya llegó a su
 * `maxSelection`, `extras` vuelve sin cambios y `error` trae el límite para que el
 * componente muestre el aviso.
 */
export const incrementExtra = (extrasState = [], section, extra) => {
  const maxSelection = section.maxSelection;
  const currentCount = getSectionSelectedCount(extrasState, section);

  if (hasMaxSelection(section) && currentCount >= maxSelection) {
    return { extras: extrasState, error: { sectionName: section.sectionName, maxSelection } };
  }

  const existingIndex = extrasState.findIndex(e => matchesExtra(e, section, extra));

  if (existingIndex >= 0) {
    return {
      extras: extrasState.map((selectedExtra, index) =>
        index === existingIndex
          ? { ...selectedExtra, quantity: (selectedExtra.quantity || 0) + 1 }
          : selectedExtra
      ),
      error: null,
    };
  }

  return {
    extras: [
      ...extrasState,
      {
        sectionId: section.sectionId || null,
        extraId: extra._id ? String(extra._id) : null,
        sectionName: section.sectionName,
        extraName: extra.name,
        price: extra.price || 0,
        quantity: 1
      }
    ],
    error: null,
  };
};

/** Resta una unidad del extra; al llegar a 0 lo quita de la lista. */
export const decrementExtra = (extrasState = [], section, extra) => {
  const existingIndex = extrasState.findIndex(e => matchesExtra(e, section, extra));

  if (existingIndex < 0) {
    return extrasState;
  }

  const target = extrasState[existingIndex];
  if ((target.quantity || 0) <= 1) {
    return extrasState.filter((_, index) => index !== existingIndex);
  }

  return extrasState.map((selectedExtra, index) =>
    index === existingIndex
      ? { ...selectedExtra, quantity: (selectedExtra.quantity || 0) - 1 }
      : selectedExtra
  );
};
