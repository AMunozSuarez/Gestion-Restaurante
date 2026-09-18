const foodModel = require('../models/foodModel');
const cashRegisterModel = require('../models/cashRegisterModel');
const Restaurant = require('../models/restaurantModel');

/**
 * Módulo de autoservicio (kiosco).
 *
 * Este archivo NO crea pedidos: expone el catálogo filtrado y aporta los middlewares que
 * envuelven a createOrderController (orderController.js). Toda la validación de extras, el
 * recálculo de totales con precios de BD, la exigencia de caja abierta y la numeración
 * siguen viviendo allí — aquí solo se agregan las reglas propias del canal.
 */

const MAX_CART_LINES = 50;
const MAX_LINE_QUANTITY = 20;
const MAX_CUSTOMER_NAME_LENGTH = 40;
const MAX_COMMENT_LENGTH = 200;

const getRestaurantSelfServiceSettings = async (restaurantId) => {
    const restaurant = await Restaurant.findById(restaurantId).select('settings name').lean();
    const settings = Restaurant.normalizeSettings(restaurant?.settings || {});
    return { restaurantName: restaurant?.name || '', selfService: settings.selfService };
};

const isCashRegisterOpen = async (restaurantId) => {
    const open = await cashRegisterModel
        .findOne({ restaurant: restaurantId, status: 'Abierta' })
        .select('_id')
        .lean();
    return Boolean(open);
};

/**
 * Espejo server-side de getEffectiveSections del frontend: resuelve las secciones de extras
 * de un producto aplicando el override del producto (visibleExtraIds) y descartando los
 * extras no disponibles. Así el kiosco nunca ve un extra que el backend rechazaría.
 */
const buildSelfServiceSections = (food) => {
    if (!Array.isArray(food?.extraSections)) return [];

    return food.extraSections
        .map((assignment) => {
            const section = assignment.section;
            if (!section || typeof section !== 'object') return null;

            const visibleIds = (assignment.visibleExtraIds || []).map((id) => String(id));
            const allExtras = section.extras || [];
            const extras = (visibleIds.length > 0
                ? allExtras.filter((extra) => visibleIds.includes(String(extra._id)))
                : allExtras)
                .filter((extra) => extra.isAvailable)
                .map((extra) => ({ _id: extra._id, name: extra.name, price: extra.price || 0 }));

            if (extras.length === 0) return null;

            return {
                sectionId: section._id,
                sectionName: section.sectionName,
                maxSelection: assignment.maxSelection ?? null,
                extras,
            };
        })
        .filter(Boolean);
};

/**
 * Huella del catálogo. El kiosco la compara en cada poll: si cambió, vuelve a pedir /menu y
 * revalida el carrito antes de que el cliente llegue a confirmar.
 */
const buildMenuVersion = (foods = []) => {
    const latest = foods.reduce((max, food) => {
        const updated = food.updatedAt ? new Date(food.updatedAt).getTime() : 0;
        return updated > max ? updated : max;
    }, 0);
    return `${foods.length}:${latest}`;
};

// GET /api/self-service/menu
const getSelfServiceMenuController = async (req, res) => {
    try {
        const restaurantId = req.user.restaurant;

        const [{ restaurantName, selfService }, cashRegisterOpen, foods] = await Promise.all([
            getRestaurantSelfServiceSettings(restaurantId),
            isCashRegisterOpen(restaurantId),
            foodModel
                .find({ restaurant: restaurantId, isAvailable: true, showInSelfService: true })
                // Se seleccionan solo los campos que el cliente final necesita: `recipe`
                // (insumos) y `code` (interno) no salen del backend.
                .select('title description price imageUrl category extraSections updatedAt')
                .populate({ path: 'category', select: 'title isAvailable' })
                .populate({ path: 'extraSections.section', select: 'sectionName extras' })
                .lean(),
        ]);

        if (!selfService.enabled) {
            return res.status(200).json({
                success: true,
                selfServiceEnabled: false,
                cashRegisterOpen,
                restaurantName,
                settings: { requireCustomerName: selfService.requireCustomerName, allowOrderComment: selfService.allowOrderComment },
                menuVersion: 'disabled',
                categories: [],
                products: [],
            });
        }

        // Un producto puede quedar isAvailable:true con su categoría apagada (esa validación
        // solo corre al activar el producto). El kiosco no debe mostrarlo.
        const visibleFoods = foods.filter((food) => food.category && food.category.isAvailable);

        const products = visibleFoods.map((food) => ({
            _id: food._id,
            title: food.title,
            description: food.description || '',
            price: food.price,
            imageUrl: food.imageUrl,
            category: { _id: food.category._id, title: food.category.title },
            extraSections: buildSelfServiceSections(food),
        }));

        const categoriesMap = new Map();
        products.forEach((product) => {
            if (!categoriesMap.has(String(product.category._id))) {
                categoriesMap.set(String(product.category._id), product.category);
            }
        });

        res.status(200).json({
            success: true,
            selfServiceEnabled: true,
            cashRegisterOpen,
            restaurantName,
            settings: { requireCustomerName: selfService.requireCustomerName, allowOrderComment: selfService.allowOrderComment },
            menuVersion: buildMenuVersion(visibleFoods),
            categories: Array.from(categoriesMap.values()),
            products,
        });
    } catch (error) {
        console.error('Error obteniendo el menú de autoservicio:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo el menú de autoservicio' });
    }
};

// GET /api/self-service/status — versión ligera para el polling del kiosco
const getSelfServiceStatusController = async (req, res) => {
    try {
        const restaurantId = req.user.restaurant;

        const [{ selfService }, cashRegisterOpen, foods] = await Promise.all([
            getRestaurantSelfServiceSettings(restaurantId),
            isCashRegisterOpen(restaurantId),
            foodModel
                .find({ restaurant: restaurantId, isAvailable: true, showInSelfService: true })
                .select('updatedAt')
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            selfServiceEnabled: selfService.enabled,
            cashRegisterOpen,
            menuVersion: selfService.enabled ? buildMenuVersion(foods) : 'disabled',
        });
    } catch (error) {
        console.error('Error obteniendo el estado de autoservicio:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo el estado de autoservicio' });
    }
};

/**
 * Gate del módulo. Cubre los dos niveles de habilitación: solo el super_admin puede poner
 * settings.selfService.enabled en true (PUT /admin/restaurants/:id), y el dueño no puede
 * tocarlo porque no está expuesto en applyRestaurantSettingsPatch.
 */
const assertSelfServiceEnabled = async (req, res, next) => {
    try {
        const { selfService } = await getRestaurantSelfServiceSettings(req.user.restaurant);

        if (!selfService.enabled) {
            return res.status(403).json({
                success: false,
                code: 'SELF_SERVICE_DISABLED',
                message: 'El módulo de autoservicio no está habilitado para este restaurante.',
            });
        }

        req.selfServiceSettings = selfService;
        next();
    } catch (error) {
        console.error('Error verificando el módulo de autoservicio:', error);
        res.status(500).json({ success: false, message: 'Error verificando el módulo de autoservicio' });
    }
};

/**
 * Verifica que cada producto del carrito siga publicado y disponible.
 *
 * Hace falta ANTES de createOrderController porque éste, ante un producto que no encuentra,
 * responde un 400 genérico ("Uno o más alimentos no pertenecen a este restaurante") y nunca
 * mira isAvailable. Sin esto, el kiosco no podría decirle al cliente qué producto quitar.
 */
const validateSelfServiceItems = async (req, res, next) => {
    try {
        const items = Array.isArray(req.body.foods) ? req.body.foods : [];

        if (items.length === 0) {
            return res.status(400).json({ success: false, code: 'EMPTY_CART', message: 'El pedido no tiene productos.' });
        }

        if (items.length > MAX_CART_LINES) {
            return res.status(400).json({ success: false, code: 'CART_TOO_LARGE', message: 'El pedido tiene demasiados productos.' });
        }

        for (const item of items) {
            const quantity = Number(item?.quantity);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_QUANTITY',
                    message: `La cantidad de cada producto debe estar entre 1 y ${MAX_LINE_QUANTITY}.`,
                });
            }
            if (!item?.food) {
                return res.status(400).json({ success: false, code: 'INVALID_ITEM', message: 'Producto inválido en el pedido.' });
            }
        }

        const ids = [...new Set(items.map((item) => String(item.food)))];
        const foods = await foodModel
            .find({ _id: { $in: ids }, restaurant: req.user.restaurant })
            .select('title isAvailable showInSelfService category')
            .populate({ path: 'category', select: 'isAvailable' })
            .lean();

        const foodsById = new Map(foods.map((food) => [String(food._id), food]));

        const unavailableItems = [];
        ids.forEach((id) => {
            const food = foodsById.get(id);

            // Un id que no existe o pertenece a otro restaurante se reporta igual que un
            // producto retirado: el cliente final no debe poder distinguirlos.
            if (!food) {
                unavailableItems.push({ foodId: id, title: '', reason: 'not_found' });
                return;
            }
            if (food.showInSelfService !== true) {
                unavailableItems.push({ foodId: id, title: food.title, reason: 'not_published' });
                return;
            }
            if (food.isAvailable !== true) {
                unavailableItems.push({ foodId: id, title: food.title, reason: 'unavailable' });
                return;
            }
            if (!food.category || food.category.isAvailable !== true) {
                unavailableItems.push({ foodId: id, title: food.title, reason: 'category_disabled' });
            }
        });

        if (unavailableItems.length > 0) {
            return res.status(409).json({
                success: false,
                code: 'ITEMS_UNAVAILABLE',
                message: 'Algunos productos ya no están disponibles.',
                unavailableItems,
            });
        }

        next();
    } catch (error) {
        console.error('Error validando los productos de autoservicio:', error);
        res.status(500).json({ success: false, message: 'Error validando los productos del pedido' });
    }
};

/**
 * Reescribe req.body por completo antes de pasárselo a createOrderController.
 *
 * Se reasigna entero (en vez de borrar campos uno a uno) para que no se cuele nada que el
 * cliente haya mandado: descuentos, propinas, métodos de pago, mesa, mesero o cuentas
 * divididas. El precio nunca viaja: createOrderController lo toma de la BD.
 */
const enforceSelfServiceOrderPayload = (req, res, next) => {
    const settings = req.selfServiceSettings;
    const customerName = String(req.body.customerName || '').trim().slice(0, MAX_CUSTOMER_NAME_LENGTH);

    if (settings.requireCustomerName && !customerName) {
        return res.status(400).json({
            success: false,
            code: 'CUSTOMER_NAME_REQUIRED',
            message: 'Necesitamos un nombre para identificar tu pedido.',
        });
    }

    const comment = settings.allowOrderComment
        ? String(req.body.comment || '').trim().slice(0, MAX_COMMENT_LENGTH)
        : '';

    req.body = {
        foods: req.body.foods, // los extras los valida createOrderController contra la BD
        section: 'mostrador',
        orderSource: 'self_service',
        payment: 'Pendiente', // el cliente paga en caja
        paymentMethods: [],
        status: 'Preparacion',
        discount: 0,
        tip: 0,
        comment,
        // buyer sin phone hace que createOrderController guarde `name` sin crear un
        // Customer: el nombre queda en el pedido y la base de clientes no se ensucia.
        buyer: customerName ? { name: customerName } : undefined,
    };

    next();
};

module.exports = {
    getSelfServiceMenuController,
    getSelfServiceStatusController,
    assertSelfServiceEnabled,
    validateSelfServiceItems,
    enforceSelfServiceOrderPayload,
    buildSelfServiceSections,
};
