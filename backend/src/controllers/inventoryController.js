const InventoryItem = require('../models/inventoryItemModel');
const InventoryMovement = require('../models/inventoryMovementModel');
const Food = require('../models/foodModel');
const ExtraSection = require('../models/extraSectionModel');
const { INVENTORY_UNITS } = require('../models/inventoryItemModel');
const { MOVEMENT_TYPES } = require('../models/inventoryMovementModel');

// ── Insumos ──────────────────────────────────────────────────────────────────

const getItems = async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const filter = { restaurant: req.restaurantId };
        if (includeInactive !== 'true') filter.isActive = true;

        const items = await InventoryItem.find(filter).sort({ name: 1 }).lean();

        // Marcar insumos con stock bajo
        const itemsWithAlerts = items.map(item => ({
            ...item,
            lowStock: item.minStock != null && item.currentStock <= item.minStock,
        }));

        res.json({ success: true, items: itemsWithAlerts });
    } catch (error) {
        console.error('Error al obtener insumos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener insumos', error: error.message });
    }
};

const createItem = async (req, res) => {
    try {
        const { name, unit, currentStock, minStock } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre es requerido' });
        }
        if (!INVENTORY_UNITS.includes(unit)) {
            return res.status(400).json({ success: false, message: 'Unidad de medida no válida' });
        }

        const parsedStock = Number(currentStock) || 0;
        const parsedMin = minStock != null && minStock !== '' ? Number(minStock) : null;

        if (parsedStock < 0) {
            return res.status(400).json({ success: false, message: 'El stock no puede ser negativo' });
        }
        if (parsedMin != null && parsedMin < 0) {
            return res.status(400).json({ success: false, message: 'El stock mínimo no puede ser negativo' });
        }

        const item = new InventoryItem({
            name: name.trim(),
            unit,
            currentStock: parsedStock,
            minStock: parsedMin,
            restaurant: req.restaurantId,
        });
        await item.save();

        // Registrar movimiento de entrada inicial si hay stock
        if (parsedStock > 0) {
            await InventoryMovement.create({
                item: item._id,
                type: 'entrada_compra',
                quantity: parsedStock,
                reference: 'Stock inicial',
                restaurant: req.restaurantId,
            });
        }

        res.status(201).json({ success: true, item });
    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(500).json({ success: false, message: 'Error al crear insumo', error: error.message });
    }
};

const updateItem = async (req, res) => {
    try {
        const { name, unit, minStock, isActive } = req.body;

        const item = await InventoryItem.findOne({ _id: req.params.id, restaurant: req.restaurantId });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
        }

        if (name !== undefined) item.name = name.trim();
        if (unit !== undefined) {
            if (!INVENTORY_UNITS.includes(unit)) {
                return res.status(400).json({ success: false, message: 'Unidad de medida no válida' });
            }
            item.unit = unit;
        }
        if (minStock !== undefined) {
            item.minStock = minStock !== null && minStock !== '' ? Number(minStock) : null;
        }
        if (isActive !== undefined) item.isActive = Boolean(isActive);

        await item.save();
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error al actualizar insumo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar insumo', error: error.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        const item = await InventoryItem.findOne({ _id: req.params.id, restaurant: req.restaurantId });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
        }

        // Desactivar en lugar de eliminar para preservar historial
        item.isActive = false;
        await item.save();

        res.json({ success: true, message: 'Insumo desactivado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar insumo', error: error.message });
    }
};

// ── Ajuste manual de stock ────────────────────────────────────────────────────

const adjustStock = async (req, res) => {
    try {
        const { type, quantity, reference } = req.body;

        if (!['entrada_compra', 'ajuste_positivo', 'ajuste_negativo'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Tipo de movimiento no válido para ajuste manual' });
        }

        const parsedQty = Number(quantity);
        if (!parsedQty || parsedQty <= 0) {
            return res.status(400).json({ success: false, message: 'La cantidad debe ser mayor a 0' });
        }

        const item = await InventoryItem.findOne({ _id: req.params.id, restaurant: req.restaurantId });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Insumo no encontrado' });
        }

        const delta = (type === 'ajuste_negativo') ? -parsedQty : parsedQty;
        const newStock = item.currentStock + delta;

        if (newStock < 0) {
            return res.status(400).json({
                success: false,
                message: `Stock insuficiente. Stock actual: ${item.currentStock}`,
            });
        }

        item.currentStock = newStock;
        await item.save();

        await InventoryMovement.create({
            item: item._id,
            type,
            quantity: parsedQty,
            reference: reference?.trim() || '',
            restaurant: req.restaurantId,
        });

        res.json({
            success: true,
            item,
            lowStock: item.minStock != null && item.currentStock <= item.minStock,
        });
    } catch (error) {
        console.error('Error al ajustar stock:', error);
        res.status(500).json({ success: false, message: 'Error al ajustar stock', error: error.message });
    }
};

// ── Movimientos ───────────────────────────────────────────────────────────────

const getMovements = async (req, res) => {
    try {
        const { itemId, type, page = 1, limit = 50 } = req.query;

        const filter = { restaurant: req.restaurantId };
        if (itemId) filter.item = itemId;
        if (type && MOVEMENT_TYPES.includes(type)) filter.type = type;

        const pageNum = Math.max(1, parseInt(page));
        const pageSize = Math.min(200, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * pageSize;

        const [movements, total] = await Promise.all([
            InventoryMovement.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .populate('item', 'name unit')
                .lean(),
            InventoryMovement.countDocuments(filter),
        ]);

        res.json({
            success: true,
            movements,
            pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener movimientos', error: error.message });
    }
};

// ── Recetas de productos ──────────────────────────────────────────────────────

const getFoodRecipe = async (req, res) => {
    try {
        const food = await Food.findOne({ _id: req.params.foodId, restaurant: req.restaurantId })
            .select('title recipe')
            .populate('recipe.ingredient', 'name unit currentStock')
            .lean();

        if (!food) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        res.json({ success: true, recipe: food.recipe || [], foodTitle: food.title });
    } catch (error) {
        console.error('Error al obtener receta:', error);
        res.status(500).json({ success: false, message: 'Error al obtener receta', error: error.message });
    }
};

const updateFoodRecipe = async (req, res) => {
    try {
        const { recipe } = req.body;

        if (!Array.isArray(recipe)) {
            return res.status(400).json({ success: false, message: 'La receta debe ser un arreglo' });
        }

        // Validar que los ingredientes pertenecen al restaurante
        const ingredientIds = recipe.map(r => r.ingredient);
        if (ingredientIds.length) {
            const validItems = await InventoryItem.find({
                _id: { $in: ingredientIds },
                restaurant: req.restaurantId,
            }).select('_id').lean();

            if (validItems.length !== ingredientIds.length) {
                return res.status(400).json({ success: false, message: 'Uno o más ingredientes no pertenecen a este restaurante' });
            }
        }

        const food = await Food.findOneAndUpdate(
            { _id: req.params.foodId, restaurant: req.restaurantId },
            { recipe },
            { new: true }
        )
            .select('title recipe')
            .populate('recipe.ingredient', 'name unit')
            .lean();

        if (!food) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        res.json({ success: true, recipe: food.recipe, foodTitle: food.title });
    } catch (error) {
        console.error('Error al actualizar receta:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar receta', error: error.message });
    }
};

// ── Recetas de extras ─────────────────────────────────────────────────────────

const getExtraRecipe = async (req, res) => {
    try {
        const { sectionId, extraId } = req.params;

        const section = await ExtraSection.findOne({ _id: sectionId, restaurant: req.restaurantId })
            .lean();

        if (!section) {
            return res.status(404).json({ success: false, message: 'Sección no encontrada' });
        }

        const extra = section.extras.find(e => e._id.toString() === extraId);
        if (!extra) {
            return res.status(404).json({ success: false, message: 'Extra no encontrado' });
        }

        // Populate ingredients manually
        const ingredientIds = (extra.recipe || []).map(r => r.ingredient);
        const ingredients = ingredientIds.length
            ? await InventoryItem.find({ _id: { $in: ingredientIds } }).select('name unit currentStock').lean()
            : [];
        const ingredientMap = new Map(ingredients.map(i => [i._id.toString(), i]));

        const recipe = (extra.recipe || []).map(r => ({
            ...r,
            ingredient: ingredientMap.get(r.ingredient.toString()) || r.ingredient,
        }));

        res.json({
            success: true,
            recipe,
            sectionName: section.sectionName,
            extraName: extra.name,
        });
    } catch (error) {
        console.error('Error al obtener receta de extra:', error);
        res.status(500).json({ success: false, message: 'Error al obtener receta de extra', error: error.message });
    }
};

const updateExtraRecipe = async (req, res) => {
    try {
        const { sectionId, extraId } = req.params;
        const { recipe } = req.body;

        if (!Array.isArray(recipe)) {
            return res.status(400).json({ success: false, message: 'La receta debe ser un arreglo' });
        }

        // Validar ingredientes
        const ingredientIds = recipe.map(r => r.ingredient);
        if (ingredientIds.length) {
            const validItems = await InventoryItem.find({
                _id: { $in: ingredientIds },
                restaurant: req.restaurantId,
            }).select('_id').lean();

            if (validItems.length !== ingredientIds.length) {
                return res.status(400).json({ success: false, message: 'Uno o más ingredientes no pertenecen a este restaurante' });
            }
        }

        const section = await ExtraSection.findOne({ _id: sectionId, restaurant: req.restaurantId });
        if (!section) {
            return res.status(404).json({ success: false, message: 'Sección no encontrada' });
        }

        const extra = section.extras.id(extraId);
        if (!extra) {
            return res.status(404).json({ success: false, message: 'Extra no encontrado' });
        }

        extra.recipe = recipe;
        await section.save();

        res.json({
            success: true,
            recipe: extra.recipe,
            sectionName: section.sectionName,
            extraName: extra.name,
        });
    } catch (error) {
        console.error('Error al actualizar receta de extra:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar receta de extra', error: error.message });
    }
};

module.exports = {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
    getMovements,
    getFoodRecipe,
    updateFoodRecipe,
    getExtraRecipe,
    updateExtraRecipe,
};
