const Order = require('../models/orderModel');
const Food = require('../models/foodModel');
const ExtraSection = require('../models/extraSectionModel');
const InventoryItem = require('../models/inventoryItemModel');
const InventoryMovement = require('../models/inventoryMovementModel');
const Restaurant = require('../models/restaurantModel');

/**
 * Descuenta el stock de insumos para una orden completada/enviada.
 * Es idempotente: si la orden ya fue descontada, no hace nada.
 * Se invoca de forma fire-and-forget desde los controladores de orden y mesa.
 */
const deductStockForOrder = async (orderId, restaurantId) => {
    // Verificar si el inventario está habilitado para el restaurante
    const restaurant = await Restaurant.findById(restaurantId)
        .select('settings.inventory')
        .lean();

    const inventoryEnabled = Boolean(restaurant?.settings?.inventory?.enabled);
    if (!inventoryEnabled) return;

    // Marcar la orden como descontada de forma atómica para evitar doble descuento
    const order = await Order.findOneAndUpdate(
        { _id: orderId, restaurant: restaurantId, inventoryDeducted: { $ne: true } },
        { $set: { inventoryDeducted: true } },
        { new: false }
    ).lean();

    // Si order es null, ya fue descontada o no existe
    if (!order) return;

    // Cargar los alimentos con sus recetas
    const foodIds = [...new Set((order.foods || []).map(f => f.food?.toString()).filter(Boolean))];
    if (!foodIds.length) return;

    const foods = await Food.find({ _id: { $in: foodIds } })
        .select('_id recipe recipeEnabled')
        .lean();

    const foodMap = new Map(foods.map(f => [f._id.toString(), f]));

    // Acumular deducciones: ingredienteId → cantidad total a descontar
    const deductions = new Map();

    for (const orderItem of order.foods || []) {
        const foodId = orderItem.food?.toString();
        if (!foodId) continue;
        const food = foodMap.get(foodId);
        const qty = Number(orderItem.quantity) || 1;

        // Receta del producto (solo si está habilitada)
        if (food?.recipeEnabled !== false && food?.recipe?.length) {
            for (const ri of food.recipe) {
                const key = ri.ingredient.toString();
                deductions.set(key, (deductions.get(key) || 0) + ri.quantity * qty);
            }
        }
    }

    // Recetas de extras seleccionados. Se busca por sectionId/extraId cuando el pedido
    // los trae (guardados desde que orderController los backfillea al validar); si no,
    // se cae a buscar por nombre, único dato disponible en pedidos anteriores a ese campo.
    const allSelectedExtras = (order.foods || []).flatMap(f => f.selectedExtras || []);
    const sectionIds = [...new Set(allSelectedExtras.map(e => e.sectionId).filter(Boolean).map(String))];
    const sectionNames = [...new Set(allSelectedExtras.filter(e => !e.sectionId).map(e => e.sectionName).filter(Boolean))];

    if (sectionIds.length || sectionNames.length) {
        const sections = await ExtraSection.find({
            restaurant: restaurantId,
            $or: [
                ...(sectionIds.length ? [{ _id: { $in: sectionIds } }] : []),
                ...(sectionNames.length ? [{ sectionName: { $in: sectionNames } }] : []),
            ],
        })
            .select('sectionName extras.name extras.recipe extras.recipeEnabled')
            .lean();

        const sectionByIdMap = new Map(sections.map(s => [s._id.toString(), s]));
        const sectionByNameMap = new Map(sections.map(s => [s.sectionName, s]));

        for (const orderItem of order.foods || []) {
            const qty = Number(orderItem.quantity) || 1;
            for (const selectedExtra of orderItem.selectedExtras || []) {
                const section = selectedExtra.sectionId
                    ? sectionByIdMap.get(String(selectedExtra.sectionId))
                    : sectionByNameMap.get(selectedExtra.sectionName);
                if (!section) continue;

                const extra = selectedExtra.extraId
                    ? section.extras.find(e => String(e._id) === String(selectedExtra.extraId))
                    : section.extras.find(e => e.name === selectedExtra.extraName);
                if (!extra?.recipe?.length || extra.recipeEnabled === false) continue;

                for (const ri of extra.recipe) {
                    const key = ri.ingredient.toString();
                    deductions.set(key, (deductions.get(key) || 0) + ri.quantity * qty);
                }
            }
        }
    }

    if (!deductions.size) return;

    // Verificar que los ingredientes pertenecen al restaurante
    const ingredientIds = [...deductions.keys()];
    const validItems = await InventoryItem.find({
        _id: { $in: ingredientIds },
        restaurant: restaurantId,
    })
        .select('_id')
        .lean();

    const validIds = new Set(validItems.map(i => i._id.toString()));

    const bulkOps = [];
    const movements = [];

    for (const [itemId, quantity] of deductions) {
        if (!validIds.has(itemId)) continue;

        bulkOps.push({
            updateOne: {
                filter: { _id: itemId, restaurant: restaurantId },
                update: { $inc: { currentStock: -quantity } },
            },
        });

        movements.push({
            item: itemId,
            type: 'salida_venta',
            quantity,
            reference: `Orden #${order.orderNumber}`,
            order: orderId,
            restaurant: restaurantId,
        });
    }

    if (!bulkOps.length) return;

    await Promise.all([
        InventoryItem.bulkWrite(bulkOps),
        InventoryMovement.insertMany(movements),
    ]);
};

module.exports = { deductStockForOrder };
