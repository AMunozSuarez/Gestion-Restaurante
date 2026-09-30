/**
 * Validación de extras y cálculo del total de un pedido, compartidos entre
 * createOrderController (POS y kiosco) y la sesión de pago remoto del autoservicio, que
 * necesita conocer el total EXACTO antes de cobrar, sin crear el pedido.
 *
 * `foodMap` es un Map<foodId, food> con los productos leídos de la BD con
 * `.select('_id price extraSections').populate('extraSections.section', 'sectionName maxSelection extras')`.
 */

/**
 * Valida (y normaliza in-place) los selectedExtras de cada ítem contra la BD: sección,
 * extra visible y disponible, precio y límite de selección. Devuelve un mensaje de error o
 * null. Muta cada selectedExtra para dejarle sectionId/extraId y los nombres vigentes.
 *
 * `lenient: true` se usa al crear un pedido YA PAGADO por el kiosco: el cliente pagó el
 * monto de la sesión, así que si entre el cobro y la creación un extra cambió de precio o se
 * desactivó, se conserva lo que se cobró en vez de rechazar el pedido.
 */
const validateSelectedExtras = (foods, foodMap, { lenient = false } = {}) => {
    for (const orderItem of foods) {
        if (!orderItem.selectedExtras || orderItem.selectedExtras.length === 0) continue;

        const food = foodMap.get(String(orderItem.food));
        if (!food || !food.extraSections || food.extraSections.length === 0) {
            if (lenient) continue;
            return 'Uno de los productos seleccionados no tiene extras configurados';
        }

        // Se matchea por sectionId/extraId cuando el item ya los trae (guardados en una
        // validación anterior); si no, se busca por nombre contra los datos vigentes y se
        // "backfillea" el id en el propio objeto para que quede guardado en el pedido.
        for (const selectedExtra of orderItem.selectedExtras) {
            const assignment = selectedExtra.sectionId
                ? food.extraSections.find(a => a.section?._id && String(a.section._id) === String(selectedExtra.sectionId))
                : food.extraSections.find(a => a.section?.sectionName === selectedExtra.sectionName);
            if (!assignment) {
                if (lenient) continue;
                return `Sección de extras "${selectedExtra.sectionName}" no válida`;
            }

            const sec = assignment.section;
            // Filtrar extras visibles para este producto
            const visibleExtras = assignment.visibleExtraIds && assignment.visibleExtraIds.length > 0
                ? sec.extras.filter(e => assignment.visibleExtraIds.map(id => id.toString()).includes(e._id.toString()))
                : sec.extras;

            const extra = selectedExtra.extraId
                ? visibleExtras.find(e => String(e._id) === String(selectedExtra.extraId) && (lenient || e.isAvailable))
                : visibleExtras.find(e => e.name === selectedExtra.extraName && (lenient || e.isAvailable));
            if (!extra) {
                if (lenient) continue;
                return `Extra "${selectedExtra.extraName}" no disponible en sección "${selectedExtra.sectionName}"`;
            }

            if (!lenient && selectedExtra.price !== extra.price) {
                return `Precio de extra "${selectedExtra.extraName}" no coincide`;
            }

            selectedExtra.sectionId = sec._id;
            selectedExtra.extraId = extra._id;
            selectedExtra.sectionName = sec.sectionName;
            selectedExtra.extraName = extra.name;
        }

        if (lenient) continue;

        // Validar límite de selección por sección (respetando override del producto).
        // A esta altura todo selectedExtra ya tiene sectionId (recién asignado arriba).
        const extrasBySection = {};
        orderItem.selectedExtras.forEach(extra => {
            const key = String(extra.sectionId);
            extrasBySection[key] = (extrasBySection[key] || 0) + 1;
        });

        for (const [sectionId, count] of Object.entries(extrasBySection)) {
            const assignment = food.extraSections.find(a => a.section?._id && String(a.section._id) === sectionId);
            const effectiveMax = assignment.maxSelection;
            if (effectiveMax !== null && effectiveMax !== undefined && count > effectiveMax) {
                return `Excedido el límite de selección para "${assignment.section.sectionName}". Máximo: ${effectiveMax}`;
            }
        }
    }

    return null;
};

// Subtotal de productos + extras (sin delivery ni descuento), con precios base de la BD.
const computeFoodsTotal = (foods, foodMap) => foods.reduce((sum, item) => {
    const basePrice = foodMap.get(String(item.food)).price * item.quantity;
    const extrasPrice = (item.selectedExtras || []).reduce((extSum, extra) => {
        return extSum + ((extra.price || 0) * item.quantity);
    }, 0);
    return sum + basePrice + extrasPrice;
}, 0);

module.exports = { validateSelectedExtras, computeFoodsTotal };
