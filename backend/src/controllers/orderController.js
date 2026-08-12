const orderModel = require('../models/orderModel');
const foodModel = require('../models/foodModel'); // Importar el modelo de alimentos
const Customer = require('../models/customerModel'); // Importar el modelo de clientes
const cashRegisterModel = require('../models/cashRegisterModel'); // Importar el modelo de caja
const Table = require('../models/tableModel'); // Importar el modelo de mesas
const Restaurant = require('../models/restaurantModel');
const mongoose = require('mongoose');
const { getChileDate, formatChileDate, getChileDayRange } = require('../utils/dateUtils');
const { getIO } = require('../socket');
const { deductStockForOrder } = require('../services/inventoryService');

const isOwnerOrSuperAdmin = (role) => role === 'owner' || role === 'super_admin';
const isOrderActive = (status) => !['Completado', 'Cancelado'].includes(status);

const normalizeSelectedExtrasForSignature = (extras = []) => {
    if (!Array.isArray(extras)) return [];

    return extras
        .map((extra) => ({
            sectionName: String(extra?.sectionName || '').trim(),
            extraName: String(extra?.extraName || '').trim(),
            price: Number(extra?.price || 0),
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
};

const buildOrderFoodDeletionSignature = (item = {}) => {
    const foodValue = item?.food;
    const foodId = typeof foodValue === 'object' && foodValue !== null
        ? (foodValue._id || foodValue.id || '')
        : (foodValue || '');

    return JSON.stringify({
        foodId: String(foodId),
        selectedExtras: normalizeSelectedExtrasForSignature(item?.selectedExtras),
    });
};

const getFoodQuantitiesBySignature = (foods = []) => {
    const quantities = new Map();

    for (const item of foods) {
        if (!item || !item.food) continue;

        const signature = buildOrderFoodDeletionSignature(item);
        const quantity = Number(item.quantity || 0);

        if (quantity <= 0) continue;

        quantities.set(signature, (quantities.get(signature) || 0) + quantity);
    }

    return quantities;
};

const hasReducedExistingFoodQuantities = (currentFoods = [], nextFoods = []) => {
    const currentQuantities = getFoodQuantitiesBySignature(currentFoods);
    const nextQuantities = getFoodQuantitiesBySignature(nextFoods);

    for (const [signature, currentQty] of currentQuantities.entries()) {
        const nextQty = nextQuantities.get(signature) || 0;
        if (nextQty < currentQty) {
            return true;
        }
    }

    return false;
};

// Firma de un item incluyendo comentario, para emparejar productos ya existentes
// con los nuevos foods enviados al editar la orden y así conservar su estado "ready".
const buildOrderFoodItemSignature = (item = {}) => JSON.stringify({
    foodId: String(item?.food || ''),
    comment: String(item?.comment || '').trim(),
    selectedExtras: normalizeSelectedExtrasForSignature(item?.selectedExtras),
});

// Al editar los productos de una orden, el frontend reconstruye el array `foods`
// completo sin el flag `ready` (ese estado solo se guarda en la BD). Para no perder
// el check de los productos que ya estaban listos, se empareja cada item nuevo con
// uno existente por firma (mismo producto + comentario + extras) y se reutiliza su
// valor de `ready`; los productos realmente nuevos quedan sin marcar.
const mergeFoodsReadyState = (previousFoods = [], nextFoods = []) => {
    const readyQueueBySignature = new Map();
    for (const item of previousFoods) {
        const signature = buildOrderFoodItemSignature(item);
        const queue = readyQueueBySignature.get(signature) || [];
        queue.push(Boolean(item?.ready));
        readyQueueBySignature.set(signature, queue);
    }

    return nextFoods.map((item) => {
        const signature = buildOrderFoodItemSignature(item);
        const queue = readyQueueBySignature.get(signature);
        const ready = queue && queue.length > 0 ? queue.shift() : false;
        return { ...item, ready };
    });
};

// CREATE A NEW ORDER

const createOrderController = async (req, res) => {
    try {
        const { foods, payment, paymentMethods, buyer, section, status, selectedAddress, comment, tableNumber, tableId, waiter, tip, discount, splitMeta, splitAccounts } = req.body;

        const restaurantId = req.user.restaurant;
        const foodIds = foods.map((item) => item.food);
        const uniqueFoodIds = [...new Set(foodIds)];

        // ── Paso 1: Ejecutar queries independientes en paralelo ──
        // Customer lookup, food validation y cash register search son independientes
        const customerPromise = (async () => {
            if (!buyer) return null;
            if (typeof buyer === 'string') {
                return Customer.findOne({ _id: buyer, restaurant: restaurantId }).lean();
            }
            if (typeof buyer === 'object' && buyer.phone) {
                const existing = await Customer.findOne({ phone: buyer.phone, restaurant: restaurantId });
                if (!existing) {
                    const newCustomer = new Customer({
                        name: buyer.name || 'Cliente',
                        phone: buyer.phone,
                        addresses: buyer.addresses || [],
                        comment: buyer.comment || '',
                        restaurant: restaurantId,
                    });
                    await newCustomer.save();
                    return newCustomer;
                }
                return existing;
            }
            return null;
        })();

        // Si es sección mesas, buscar la mesa para asignación atómica
        const tablePromise = (async () => {
            if (section !== 'mesas') return null;
            if (tableId) {
                return Table.findOne({ _id: tableId, restaurant: restaurantId });
            }
            if (tableNumber) {
                return Table.findOne({ tableNumber, restaurant: restaurantId });
            }
            return null;
        })();

        const [customer, existingFoods, currentCashRegister, table] = await Promise.all([
            customerPromise,
            foodModel.find({ _id: { $in: uniqueFoodIds }, restaurant: restaurantId })
                .select('_id price extraSections')
                .populate('extraSections.section', 'sectionName maxSelection extras')
                .lean(),
            cashRegisterModel.findOne({ restaurant: restaurantId, status: 'Abierta' }).select('_id').lean(),
            tablePromise,
        ]);

        // ── Validaciones rápidas (sin queries) ──
        if (buyer && typeof buyer === 'string' && !customer) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado o no pertenece a este restaurante' });
        }

        if (existingFoods.length !== uniqueFoodIds.length) {
            return res.status(400).json({ success: false, message: 'Uno o más alimentos no pertenecen a este restaurante' });
        }

        if (!currentCashRegister) {
            return res.status(400).json({ success: false, message: 'No hay una caja abierta. Por favor, abre una caja antes de crear órdenes.' });
        }

        // ── Evitar duplicados si la mesa ya tiene un pedido activo ──
        if (table && table.currentOrder) {
            const currentOrderId = table.currentOrder;
            const existingOrder = await orderModel.findById(currentOrderId).select('status orderNumber').lean();

            if (!existingOrder) {
                await Table.updateOne(
                    { _id: table._id, restaurant: restaurantId, currentOrder: currentOrderId },
                    { $set: { currentOrder: null } }
                );
                table.currentOrder = null;
            } else if (isOrderActive(existingOrder.status)) {
                return res.status(409).json({
                    success: false,
                    message: 'La mesa ya tiene un pedido en curso',
                    orderId: existingOrder._id,
                    orderNumber: existingOrder.orderNumber,
                });
            } else {
                await Table.updateOne(
                    { _id: table._id, restaurant: restaurantId, currentOrder: currentOrderId },
                    { $set: { currentOrder: null } }
                );
                table.currentOrder = null;
            }
        }

        // ── Validar extras seleccionados ──
        const foodMap = new Map(existingFoods.map(f => [f._id.toString(), f]));
        for (const orderItem of foods) {
            if (orderItem.selectedExtras && orderItem.selectedExtras.length > 0) {
                const food = foodMap.get(orderItem.food);
                if (!food || !food.extraSections || food.extraSections.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Uno de los productos seleccionados no tiene extras configurados'
                    });
                }

                // Validar cada extra seleccionado
                for (const selectedExtra of orderItem.selectedExtras) {
                    const assignment = food.extraSections.find(a => a.section?.sectionName === selectedExtra.sectionName);
                    if (!assignment) {
                        return res.status(400).json({
                            success: false,
                            message: `Sección de extras "${selectedExtra.sectionName}" no válida`
                        });
                    }

                    const sec = assignment.section;
                    // Filtrar extras visibles para este producto
                    const visibleExtras = assignment.visibleExtraIds && assignment.visibleExtraIds.length > 0
                        ? sec.extras.filter(e => assignment.visibleExtraIds.map(id => id.toString()).includes(e._id.toString()))
                        : sec.extras;

                    const extra = visibleExtras.find(e => e.name === selectedExtra.extraName && e.isAvailable);
                    if (!extra) {
                        return res.status(400).json({
                            success: false,
                            message: `Extra "${selectedExtra.extraName}" no disponible en sección "${selectedExtra.sectionName}"`
                        });
                    }

                    if (selectedExtra.price !== extra.price) {
                        return res.status(400).json({
                            success: false,
                            message: `Precio de extra "${selectedExtra.extraName}" no coincide`
                        });
                    }
                }

                // Validar límite de selección por sección (respetando override del producto)
                const extrasBySection = {};
                orderItem.selectedExtras.forEach(extra => {
                    extrasBySection[extra.sectionName] = (extrasBySection[extra.sectionName] || 0) + 1;
                });

                for (const [sectionName, count] of Object.entries(extrasBySection)) {
                    const assignment = food.extraSections.find(a => a.section?.sectionName === sectionName);
                    const effectiveMax = assignment.maxSelection;
                    if (effectiveMax !== null && effectiveMax !== undefined && count > effectiveMax) {
                        return res.status(400).json({
                            success: false,
                            message: `Excedido el límite de selección para "${sectionName}". Máximo: ${effectiveMax}`
                        });
                    }
                }
            }
        }

        // ── Calcular delivery cost ──
        let deliveryCost = 0;
        if (selectedAddress && customer && customer.addresses) {
            const addressWithCost = customer.addresses.find(addr => addr.address === selectedAddress);
            if (addressWithCost && typeof addressWithCost.deliveryCost === 'number') {
                deliveryCost = addressWithCost.deliveryCost;
            }
        }

        // ── Calcular total con Map para O(n) en vez de O(n²) ──
        const foodPriceMap = new Map(existingFoods.map(f => [f._id.toString(), f.price]));
        const total = foods.reduce((sum, item) => {
            // Calcular precio base del producto
            const basePrice = foodPriceMap.get(item.food) * item.quantity;
            
            // Calcular precio de extras seleccionados
            const extrasPrice = (item.selectedExtras || []).reduce((extSum, extra) => {
                return extSum + ((extra.price || 0) * item.quantity);
            }, 0);
            
            return sum + basePrice + extrasPrice;
        }, 0) + deliveryCost;

        // ── Paso 2: Obtener número de orden (depende de cashRegister) ──
        const lastOrder = await orderModel.findOne({ 
            cashRegister: currentCashRegister._id 
        }).sort({ orderNumber: -1 }).select('orderNumber').lean();
        
        const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

        // ── Paso 3: Crear y guardar orden ──
        const order = new orderModel({
            orderNumber,
            foods,
            payment: payment || null,
            paymentMethods: paymentMethods || [],
            splitMeta: splitMeta || { enabled: false, count: 0 },
            splitAccounts: Array.isArray(splitAccounts) ? splitAccounts : [],
            total: total - (discount || 0),
            deliveryCost,
            name: !customer ? (buyer?.name || null) : null,
            buyer: customer ? customer._id : null,
            selectedAddress: customer ? selectedAddress : null,
            tableNumber: tableNumber || null,
            waiter: waiter || null,
            tip: tip || 0,
            discount: discount || 0,
            section,
            status: status || 'Preparacion',
            comment: comment || '',
            cashRegister: currentCashRegister._id,
            restaurant: restaurantId,
        });

        await order.save();

        // ── Paso 4: Asignar orden a mesa si es sección "mesas" (operación atómica) ──
        let populatedTable = null;
        if (table) {
            const tableUpdate = { currentOrder: order._id };
            if (table.status === 'available') {
                tableUpdate.status = 'occupied';
                tableUpdate.openedAt = new Date();
            }

            const updatedTable = await Table.findOneAndUpdate(
                { _id: table._id, restaurant: restaurantId, $or: [{ currentOrder: null }, { currentOrder: order._id }] },
                { $set: tableUpdate },
                { new: true }
            );

            if (!updatedTable) {
                await orderModel.findByIdAndDelete(order._id);
                return res.status(409).json({
                    success: false,
                    message: 'La mesa ya tiene un pedido en curso',
                });
            }

            // Populate la mesa para el evento socket
            populatedTable = await Table.findById(updatedTable._id)
                .populate({
                    path: 'currentOrder',
                    populate: {
                        path: 'foods.food',
                        model: 'Food'
                    }
                })
                .populate('waiter', 'userName email');
        }

        // ── Paso 5: Populate en el documento ya guardado (evita un findById extra) ──
        await order.populate([
            { path: 'foods.food', select: 'title price category' },
            { path: 'buyer', select: 'name phone' },
            { path: 'waiter', select: 'userName name' },
        ]);

        // Emit socket events for real-time updates
        try {
            const senderSocketId = req.headers['x-socket-id'] || null;
            const io = getIO();
            io.to(`restaurant:${restaurantId}`).emit('order:created', { order, _fromSocketId: senderSocketId });

            // Si se asignó a mesa, emitir table:updated también
            if (populatedTable) {
                io.to(`restaurant:${restaurantId}`).emit('table:updated', { table: populatedTable });
            }
        } catch (socketErr) {
            console.error('Error emitiendo socket events:', socketErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            order,
        });
    } catch (error) {
        console.error('Error creando el pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando el pedido',
            error: error.message,
        });
    }
};

// GET ALL ORDERS
const getAllOrdersController = async (req, res) => {
    try {
        const { status, section, limit, sortBy = 'createdAt' } = req.query;

        const allowedSorts = ['createdAt', 'updatedAt', 'orderNumber'];
        const validSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';

        // Obtener solo el _id de la caja abierta
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        }).select('_id').lean();

        if (!currentCashRegister) {
            return res.status(200).json({ success: true, message: 'No hay una caja abierta', orders: [] });
        }

        const filters = {
            restaurant: req.user.restaurant,
            cashRegister: currentCashRegister._id,
        };
        if (status) filters.status = status;
        if (section) filters.section = section;

        let query = orderModel
            .find(filters)
            .sort({ [validSortBy]: -1 })
            .populate('foods.food', 'title price category extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone addresses')
            .populate('waiter', 'userName name')
            .lean();

        if (limit) query = query.limit(Number(limit));

        const orders = await query;

        res.status(200).json({
            success: true,
            message: 'Pedidos recuperados exitosamente',
            orders: orders || [],
        });
    } catch (error) {
        console.error('Error recuperando los pedidos:', error);
        res.status(500).json({ success: false, message: 'Error recuperando los pedidos', error });
    }
};

// GET AN ORDER BY ID
const getOrderByIdController = async (req, res) => {
    try {
        const order = await orderModel
            .findOne({ _id: req.params.id, restaurant: req.user.restaurant })
            .populate('foods.food', 'title price category extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone addresses')
            .populate('waiter', 'userName name')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no pertenece a este restaurante' });
        }

        res.status(200).json({ success: true, message: 'Pedido recuperado exitosamente', order });
    } catch (error) {
        console.error('Error recuperando el pedido:', error);
        res.status(500).json({ success: false, message: 'Error recuperando el pedido', error: error.message });
    }
};

// GET AN ORDER BY NUMBER
const getOrderByNumberController = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        }).select('_id').lean();

        if (!currentCashRegister) {
            return res.status(400).json({ success: false, message: 'No se puede buscar órdenes sin una caja abierta. Por favor, abra una caja primero.' });
        }

        const order = await orderModel
            .findOne({ orderNumber, cashRegister: currentCashRegister._id })
            .populate('foods.food', 'title price category extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone addresses')
            .populate('waiter', 'userName name')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        res.status(200).json({ success: true, message: 'Pedido recuperado exitosamente', order });
    } catch (error) {
        console.error('Error recuperando el pedido por número:', error);
        res.status(500).json({ success: false, message: 'Error recuperando el pedido', error: error.message });
    }
};

// UPDATE AN ORDER
const updateOrderController = async (req, res) => {
    try {
        const { buyer, foods, payment, paymentMethods, section, status, selectedAddress, comment, tableNumber, waiter, tip, discount, deletedFoods, newFoods, splitMeta, splitAccounts, kitchenReadyAt } = req.body;

        const restaurantId = req.user.restaurant;
        const isPrivilegedUser = isOwnerOrSuperAdmin(req.user?.role);
        let currentOrderSnapshot = null;

        if (foods !== undefined || deletedFoods !== undefined || discount !== undefined) {
            currentOrderSnapshot = await orderModel
                .findOne({ _id: req.params.id, restaurant: restaurantId })
                .select('foods deletedFoods total discount kitchenReadyAt')
                .lean();

            if (!currentOrderSnapshot) {
                return res.status(404).json({
                    success: false,
                    message: 'Pedido no encontrado o no pertenece a este restaurante',
                });
            }
        }

        if (!isPrivilegedUser && (Array.isArray(foods) || Array.isArray(deletedFoods))) {
            const restaurant = await Restaurant.findById(restaurantId)
                .select('settings.permissions.onlyOwnerCanDeleteOrderItems')
                .lean();

            const onlyOwnerCanDeleteOrderItems =
                restaurant?.settings?.permissions?.onlyOwnerCanDeleteOrderItems === true;

            if (onlyOwnerCanDeleteOrderItems) {
                const currentDeletedFoods = Array.isArray(currentOrderSnapshot?.deletedFoods)
                    ? currentOrderSnapshot.deletedFoods
                    : [];
                const requestDeletedFoods = Array.isArray(deletedFoods)
                    ? deletedFoods
                    : null;

                const deletedFoodsIncreased =
                    Array.isArray(requestDeletedFoods) && requestDeletedFoods.length > currentDeletedFoods.length;
                const reducedExistingFoods =
                    Array.isArray(foods) && hasReducedExistingFoodQuantities(currentOrderSnapshot?.foods || [], foods);

                if (deletedFoodsIncreased || reducedExistingFoods) {
                    return res.status(403).json({
                        success: false,
                        message: 'Solo el dueño puede eliminar productos de una orden con la configuración actual.',
                    });
                }
            }
        }


        if ((status === 'Completado' || status === 'Enviado') && kitchenReadyAt === undefined) {
            const restaurant = await Restaurant.findById(restaurantId)
                .select('settings.kitchenDisplay')
                .lean();
            const kitchenDisplayEnabled = restaurant?.settings?.kitchenDisplay?.enabled === true;
            const requireKitchenReadyToClose = restaurant?.settings?.kitchenDisplay?.requireReadyToClose === true;

            if (kitchenDisplayEnabled && requireKitchenReadyToClose) {
                const orderForReadyCheck = await orderModel
                    .findOne({ _id: req.params.id, restaurant: restaurantId })
                    .select('kitchenReadyAt foods')
                    .lean();

                const orderHasProducts = Array.isArray(orderForReadyCheck?.foods) && orderForReadyCheck.foods.length > 0;

                if (orderForReadyCheck && orderHasProducts && !orderForReadyCheck.kitchenReadyAt) {
                    return res.status(409).json({
                        success: false,
                        message: 'El pedido aún no está listo en cocina',
                    });
                }
            }
        }

        if (kitchenReadyAt && !isPrivilegedUser) {
            const restaurant = await Restaurant.findById(restaurantId)
                .select('settings.kitchenDisplay')
                .lean();
            const onlyOwnerCanMarkReady = restaurant?.settings?.kitchenDisplay?.onlyOwnerCanMarkReady === true;

            if (onlyOwnerCanMarkReady) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo el dueño puede confirmar el pedido como listo.',
                });
            }
        }

        // Preparar objeto de actualización con campos simples
        const updateData = {};
        if (payment !== undefined) updateData.payment = payment;
        if (paymentMethods !== undefined) updateData.paymentMethods = paymentMethods;
        if (status !== undefined) updateData.status = status;
        if (kitchenReadyAt !== undefined) updateData.kitchenReadyAt = kitchenReadyAt;
        if (comment !== undefined) updateData.comment = comment;
        if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
        if (waiter !== undefined) updateData.waiter = waiter;
        if (tip !== undefined) updateData.tip = tip;
        if (discount !== undefined) updateData.discount = discount;
        if (splitMeta !== undefined) updateData.splitMeta = splitMeta;
        if (splitAccounts !== undefined && Array.isArray(splitAccounts)) {
            updateData.splitAccounts = splitAccounts;
        }
        if (deletedFoods !== undefined && Array.isArray(deletedFoods)) {
            updateData.deletedFoods = deletedFoods;
            updateData.hasDeletedItems = deletedFoods.length > 0;
        }

        // ── Si se envían foods, validar en paralelo ──
        if (foods && Array.isArray(foods)) {
            const invalidFood = foods.find((item) => !item.food || !item.quantity);
            if (invalidFood) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los elementos de foods deben tener las propiedades food y quantity.',
                });
            }

            const foodIds = foods.map((item) => item.food);
            const uniqueFoodIds = [...new Set(foodIds)];

            // Ejecutar customer lookup y food validation en paralelo
            const customerPromise = (async () => {
                if (!buyer || !buyer.phone) return null;
                let customer = await Customer.findOne({ phone: buyer.phone, restaurant: restaurantId });
                if (!customer) {
                    customer = new Customer({
                        name: buyer.name,
                        phone: buyer.phone,
                        addresses: buyer.addresses || [],
                        comment: buyer.comment || '',
                        restaurant: restaurantId,
                    });
                    await customer.save();
                } else {
                    let needsSave = false;
                    if (buyer.name && customer.name !== buyer.name) { customer.name = buyer.name; needsSave = true; }
                    if (buyer.comment && customer.comment !== buyer.comment) { customer.comment = buyer.comment; needsSave = true; }
                    if (buyer.addresses && Array.isArray(buyer.addresses)) {
                        customer.addresses.forEach((addr) => {
                            if (addr.address === selectedAddress) {
                                const newAddr = buyer.addresses.find((na) => na.address === selectedAddress);
                                if (newAddr) { addr.deliveryCost = newAddr.deliveryCost; needsSave = true; }
                            }
                        });
                        buyer.addresses.forEach((newAddress) => {
                            if (!customer.addresses.find((addr) => addr.address === newAddress.address)) {
                                customer.addresses.push(newAddress);
                                needsSave = true;
                            }
                        });
                    }
                    if (needsSave) await customer.save();
                }
                return customer;
            })();

            const [customer, existingFoods] = await Promise.all([
                customerPromise,
                foodModel.find({ _id: { $in: uniqueFoodIds }, restaurant: restaurantId })
                    .select('_id price extraSections')
                    .populate('extraSections.section', 'sectionName maxSelection extras')
                    .lean(),
            ]);

            if (existingFoods.length !== uniqueFoodIds.length) {
                return res.status(400).json({ success: false, message: 'Uno o más alimentos no pertenecen a este restaurante' });
            }

            // ── Validar extras seleccionados ──
            const foodMap = new Map(existingFoods.map(f => [f._id.toString(), f]));
            for (const orderItem of foods) {
                if (orderItem.selectedExtras && orderItem.selectedExtras.length > 0) {
                    const food = foodMap.get(orderItem.food);
                    if (!food || !food.extraSections || food.extraSections.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Uno de los productos seleccionados no tiene extras configurados'
                        });
                    }

                    for (const selectedExtra of orderItem.selectedExtras) {
                        const assignment = food.extraSections.find(a => a.section?.sectionName === selectedExtra.sectionName);
                        if (!assignment) {
                            return res.status(400).json({
                                success: false,
                                message: `Sección de extras "${selectedExtra.sectionName}" no válida`
                            });
                        }

                        const sec = assignment.section;
                        const visibleExtras = assignment.visibleExtraIds && assignment.visibleExtraIds.length > 0
                            ? sec.extras.filter(e => assignment.visibleExtraIds.map(id => id.toString()).includes(e._id.toString()))
                            : sec.extras;

                        const extra = visibleExtras.find(e => e.name === selectedExtra.extraName && e.isAvailable);
                        if (!extra) {
                            return res.status(400).json({
                                success: false,
                                message: `Extra "${selectedExtra.extraName}" no disponible en sección "${selectedExtra.sectionName}"`
                            });
                        }

                        if (selectedExtra.price !== extra.price) {
                            return res.status(400).json({
                                success: false,
                                message: `Precio de extra "${selectedExtra.extraName}" no coincide`
                            });
                        }
                    }

                    const extrasBySection = {};
                    orderItem.selectedExtras.forEach(extra => {
                        extrasBySection[extra.sectionName] = (extrasBySection[extra.sectionName] || 0) + 1;
                    });

                    for (const [sectionName, count] of Object.entries(extrasBySection)) {
                        const assignment = food.extraSections.find(a => a.section?.sectionName === sectionName);
                        const effectiveMax = assignment.maxSelection;
                        if (effectiveMax !== null && effectiveMax !== undefined && count > effectiveMax) {
                            return res.status(400).json({
                                success: false,
                                message: `Excedido el límite de selección para "${sectionName}". Máximo: ${effectiveMax}`
                            });
                        }
                    }
                }
            }

            let deliveryCost = 0;
            if (customer && selectedAddress) {
                const selectedAddressObj = customer.addresses.find((addr) => addr.address === selectedAddress);
                if (!selectedAddressObj) {
                    return res.status(400).json({ success: false, message: 'La dirección seleccionada no está asociada al cliente' });
                }
                deliveryCost = selectedAddressObj.deliveryCost;
            }

            // Calcular total con Map para O(n) en vez de O(n²)
            const foodPriceMap = new Map(existingFoods.map(f => [f._id.toString(), f.price]));
            const total = foods.reduce((sum, item) => {
                // Calcular precio base del producto
                const basePrice = foodPriceMap.get(item.food) * item.quantity;
                
                // Calcular precio de extras seleccionados
                const extrasPrice = (item.selectedExtras || []).reduce((extSum, extra) => {
                    return extSum + ((extra.price || 0) * item.quantity);
                }, 0);
                
                return sum + basePrice + extrasPrice;
            }, 0) + deliveryCost;

            updateData.name = !customer && buyer ? buyer.name : null;
            updateData.buyer = customer ? customer._id : null;
            updateData.foods = mergeFoodsReadyState(currentOrderSnapshot.foods || [], foods);
            updateData.kitchenReadyAt = null;
            if (currentOrderSnapshot.kitchenReadyAt) {
                updateData.kitchenActivityAt = new Date();
            }
            if (section !== undefined) updateData.section = section;
            updateData.total = total - (discount || 0);
            updateData.deliveryCost = deliveryCost;
            updateData.selectedAddress = customer ? selectedAddress : null;
        } else if (discount !== undefined) {
            // Si se actualiza solo el descuento sin cambiar los foods, recalcular el total
            const currentOrder = currentOrderSnapshot || await orderModel.findById(req.params.id).lean();
            if (currentOrder) {
                // El total anterior sin descuento es: total anterior + descuento anterior
                const totalWithoutDiscount = currentOrder.total + (currentOrder.discount || 0);
                updateData.total = totalWithoutDiscount - discount;
            }
        }

        // ── Actualizar y popular en una sola cadena (findOneAndUpdate en vez de find + findByIdAndUpdate) ──
        const populatedOrder = await orderModel.findOneAndUpdate(
            { _id: req.params.id, restaurant: restaurantId },
            updateData,
            { new: true, runValidators: true }
        )
            .populate('foods.food', 'title price category extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone')
            .populate('waiter', 'userName name')
            .lean();

        if (!populatedOrder) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no pertenece a este restaurante' });
        }

        // Descontar inventario si la orden pasa a Completado o Enviado
        if (status === 'Completado' || status === 'Enviado') {
            deductStockForOrder(populatedOrder._id, restaurantId).catch(err =>
                console.error('Error al descontar inventario:', err)
            );
        }

        // Emit socket event for real-time updates
        try {
            const senderSocketId = req.headers['x-socket-id'] || null;
            const payload = { order: populatedOrder, _fromSocketId: senderSocketId };
            if (newFoods && Array.isArray(newFoods) && newFoods.length > 0) {
                payload.newFoods = newFoods;
                console.log('📡 Emitiendo socket con newFoods:', newFoods.length, 'items');
            }
            if (deletedFoods && Array.isArray(deletedFoods) && deletedFoods.length > 0) {
                payload.deletedFoods = deletedFoods;
                console.log('📡 Emitiendo socket con deletedFoods:', deletedFoods.length, 'items');
            }
            getIO().to(`restaurant:${restaurantId}`).emit('order:updated', payload);
        } catch (socketErr) {
            console.error('Error emitiendo socket order:updated:', socketErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Pedido actualizado correctamente',
            order: populatedOrder,
        });
    } catch (error) {
        console.error('Error actualizando el pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando el pedido',
            error: error.message,
        });
    }
};

// MARCAR/DESMARCAR UN PRODUCTO DE LA ORDEN COMO LISTO (KDS por producto)
const updateOrderItemReadyController = async (req, res) => {
    try {
        const { foodId, ready } = req.body;
        const restaurantId = req.user.restaurant;

        if (!foodId || typeof ready !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'foodId y ready (booleano) son requeridos',
            });
        }

        const order = await orderModel.findOne({ _id: req.params.id, restaurant: restaurantId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado o no pertenece a este restaurante' });
        }

        const item = order.foods.find((foodItem) => foodItem._id.toString() === foodId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado en el pedido' });
        }

        item.ready = ready;

        await order.save();

        const populatedOrder = await orderModel.findById(order._id)
            .populate('foods.food', 'title price category extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone')
            .populate('waiter', 'userName name')
            .lean();

        try {
            const senderSocketId = req.headers['x-socket-id'] || null;
            getIO().to(`restaurant:${restaurantId}`).emit('order:updated', { order: populatedOrder, _fromSocketId: senderSocketId });
        } catch (socketErr) {
            console.error('Error emitiendo socket order:updated:', socketErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Producto actualizado correctamente',
            order: populatedOrder,
        });
    } catch (error) {
        console.error('Error actualizando estado de producto del pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando estado de producto del pedido',
            error: error.message,
        });
    }
};

// DELETE AN ORDER
const deleteOrderController = async (req, res) => {
    try {
        const order = await orderModel.findOneAndDelete({ _id: req.params.id, restaurant: req.user.restaurant });
        if (!order) {
            return res.status(404).send({
                success: false,
                message: 'Pedido no encontrado o no pertenece a este restaurante'
            });
        }
        res.status(200).send({
            success: true,
            message: 'Pedido eliminado exitosamente',
            order
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




const getFilteredOrders = async (req, res) => {
    try {
        const { date, status, paymentMethod } = req.query;
        const { cashRegisterId } = req.params; // Obtener el ID de la caja registradora desde los parámetros

        const filters = {
            restaurant: req.user.restaurant, // Filtrar por el restaurante del usuario autenticado
        };

        // Filtrar por caja registradora si se proporciona
        if (cashRegisterId) {
            filters.cashRegister = cashRegisterId;
        }

        // Filtrar por fecha (usando createdAt)
        if (date) {
            const dateRange = getChileDayRange(date);

            if (!dateRange) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de fecha inválido. Usa YYYY-MM-DD',
                });
            }

            filters.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        // Filtrar por estado
        if (status) {
            filters.status = status;
        }

        // Filtrar por método de pago (usando payment)
        if (paymentMethod) {
            filters.payment = paymentMethod;
        }

        const orders = await orderModel.find(filters)
            .sort({ createdAt: -1 })
            .populate('foods.food', 'title price extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('waiter', 'userName name')
            .populate('buyer', 'name phone')
            .populate('cashRegister', 'dateOpened dateClosed status')
            .lean();
        
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error en getFilteredOrders:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las órdenes', error });
    }
};

// export controllers (moved down to include getRecentOrders)

// GET RECENT ORDERS (limit, status, section)
const getRecentOrders = async (req, res) => {
    try {
        const { limit = 10, status, section } = req.query;

        let { sortBy } = req.query;
        const allowedSorts = ['createdAt', 'updatedAt'];
        if (!allowedSorts.includes(sortBy)) sortBy = 'createdAt';

        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        }).select('_id').lean();

        if (!currentCashRegister) {
            return res.status(200).json({ success: true, message: 'No hay una caja abierta', orders: [] });
        }

        const filters = {
            restaurant: req.user.restaurant,
            cashRegister: currentCashRegister._id,
        };

        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filters.status = { $in: statuses };
        }
        if (section) filters.section = section;

        const orders = await orderModel.find(filters)
            .sort({ [sortBy]: -1 })
            .limit(Number(limit) || 10)
            .populate('foods.food', 'title price category extraSections')
            .populate('buyer', 'name phone')
            .lean();

        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error en getRecentOrders:', error);
        res.status(500).json({ success: false, message: 'Error al obtener órdenes recientes', error });
    }
};

// GET SECTION ORDERS (active + recent in one call)
const getSectionOrders = async (req, res) => {
    try {
        const { section, recentLimit = 10, recentStatuses = 'Completado,Cancelado' } = req.query;

        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        }).select('_id').lean();

        if (!currentCashRegister) {
            return res.status(200).json({ success: true, message: 'No hay una caja abierta', active: [], recent: [] });
        }

        const baseFilter = {
            restaurant: req.user.restaurant,
            cashRegister: currentCashRegister._id,
        };
        if (section) baseFilter.section = section;

        const recentStatusList = recentStatuses.split(',').map(s => s.trim());

        // Execute both queries in parallel
        const [active, recent] = await Promise.all([
            orderModel.find({ ...baseFilter, status: 'Preparacion' })
                .sort({ createdAt: -1 })
                .populate('foods.food', 'title price category extraSections')
                .populate('deletedFoods.food', 'title price extraSections')
                .populate('buyer', 'name phone addresses')
                .populate('waiter', 'userName name')
                .lean(),
            orderModel.find({ ...baseFilter, status: { $in: recentStatusList } })
                .sort({ updatedAt: -1 })
                .limit(Number(recentLimit))
                .populate('foods.food', 'title price category extraSections')
                .populate('buyer', 'name phone')
                .lean(),
        ]);

        res.status(200).json({ success: true, active, recent });
    } catch (error) {
        console.error('Error en getSectionOrders:', error);
        res.status(500).json({ success: false, message: 'Error al obtener órdenes de sección', error });
    }
};

// GET ALL SALES (ALL ORDERS) FOR SALES PAGE - WITHOUT CASH REGISTER FILTER
const getAllSalesController = async (req, res) => {
    try {
        const { status, section, limit, sortBy = 'createdAt', dateFrom, dateTo, hasDeletedItems, page, paymentMethod } = req.query;

        // Validar sortBy para seguridad
        const allowedSorts = ['createdAt', 'updatedAt', 'orderNumber'];
        const validSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';

        // Construir filtros - SOLO filtrar por restaurante, NO por caja
        const filters = {
            restaurant: req.user.restaurant
        };

        // Agregar filtros opcionales
        if (status) {
            filters.status = status;
        }
        if (section) {
            filters.section = section;
        }
        if (paymentMethod) {
            filters.$or = [
                { 'paymentMethods.method': paymentMethod },
                { payment: paymentMethod }
            ];
        }
        if (hasDeletedItems === 'true') {
            filters.hasDeletedItems = true;
        }

        // Filtros de fecha en zona horaria de Chile
        if (dateFrom || dateTo) {
            filters.createdAt = {};
            
            if (dateFrom) {
                // Obtener inicio del día en Chile para la fecha 'desde'
                const fromRange = getChileDayRange(dateFrom);
                filters.createdAt.$gte = fromRange.start;
            }
            
            if (dateTo) {
                // Obtener fin del día en Chile para la fecha 'hasta'
                const toRange = getChileDayRange(dateTo);
                filters.createdAt.$lte = toRange.end;
            }
        }


        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const skip = (pageNum - 1) * pageSize;
        const aggregateFilters = { ...filters };

        if (aggregateFilters.restaurant && mongoose.Types.ObjectId.isValid(String(aggregateFilters.restaurant))) {
            aggregateFilters.restaurant = new mongoose.Types.ObjectId(String(aggregateFilters.restaurant));
        }

        const [totalCount, orders, summaryAgg, paymentAgg] = await Promise.all([
            orderModel.countDocuments(filters),
            orderModel
                .find(filters)
                .sort({ [validSortBy]: -1 })
                .skip(skip)
                .limit(pageSize)
                .populate('foods.food', 'title price extraSections')
                .populate('deletedFoods.food', 'title price extraSections')
                .populate('buyer', 'name phone')
                .populate('waiter', 'userName name')
                .lean(),
            orderModel.aggregate([
                { $match: aggregateFilters },
                {
                    $group: {
                        _id: null,
                        totalVentas: { $sum: 1 },
                        ventasCompletadas: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['Completado', 'Enviado']] }, 1, 0],
                            },
                        },
                        ventasCanceladas: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'Cancelado'] }, 1, 0],
                            },
                        },
                        totalMonto: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['Completado', 'Enviado']] },
                                    { $ifNull: ['$total', 0] },
                                    0,
                                ],
                            },
                        },
                        montoDelivery: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $in: ['$status', ['Completado', 'Enviado']] },
                                            { $eq: ['$section', 'delivery'] },
                                        ],
                                    },
                                    { $ifNull: ['$deliveryCost', 0] },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            orderModel.aggregate([
                {
                    $match: {
                        ...aggregateFilters,
                        status: { $in: ['Completado', 'Enviado'] },
                    },
                },
                {
                    $project: {
                        payment: 1,
                        total: { $ifNull: ['$total', 0] },
                        paymentMethods: { $ifNull: ['$paymentMethods', []] },
                    },
                },
                {
                    $project: {
                        payments: {
                            $cond: [
                                { $gt: [{ $size: '$paymentMethods' }, 0] },
                                {
                                    $map: {
                                        input: '$paymentMethods',
                                        as: 'pm',
                                        in: {
                                            method: '$$pm.method',
                                            amount: { $min: [{ $ifNull: ['$$pm.amount', 0] }, '$total'] },
                                        },
                                    },
                                },
                                [{ method: '$payment', amount: '$total' }],
                            ],
                        },
                    },
                },
                { $unwind: '$payments' },
                {
                    $group: {
                        _id: '$payments.method',
                        amount: { $sum: { $ifNull: ['$payments.amount', 0] } },
                    },
                },
            ]),
        ]);

        const summary = summaryAgg?.[0] || {};

        const amountByMethod = {
            Efectivo: 0,
            Debito: 0,
            Transferencia: 0,
        };

        (paymentAgg || []).forEach((item) => {
            if (amountByMethod[item._id] !== undefined) {
                amountByMethod[item._id] += item.amount || 0;
            }
        });

        const statistics = {
            totalVentas: summary.totalVentas || totalCount || 0,
            totalMonto: summary.totalMonto || 0,
            ventasCompletadas: summary.ventasCompletadas || 0,
            ventasCanceladas: summary.ventasCanceladas || 0,
            montoEfectivo: amountByMethod.Efectivo,
            montoTarjeta: amountByMethod.Debito,
            montoTransferencia: amountByMethod.Transferencia,
            montoDelivery: summary.montoDelivery || 0,
        };

        res.status(200).json({
            success: true,
            message: 'Todas las ventas recuperadas exitosamente',
            orders,
            statistics,
            pagination: {
                page: pageNum,
                limit: pageSize,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSize)
            },
            timezone: 'America/Santiago',
            currentChileTime: formatChileDate(getChileDate())
        });
    } catch (error) {
        console.error('Error en getAllSalesController:', error);
        res.status(500).send({
            success: false,
            message: 'Error al obtener las ventas',
            error: error.message,
        });
    }
};

// GET TIPS WITH FILTERS
const getTipsController = async (req, res) => {
    try {
        const { cashRegisterId, waiterId, dateFrom, dateTo, activeOnly } = req.query;

        console.log('🔍 Obteniendo propinas con filtros:', { cashRegisterId, waiterId, dateFrom, dateTo, activeOnly });

        // Construir filtros
        const filters = {
            restaurant: req.user.restaurant,
            tip: { $gt: 0 }, // Solo órdenes con propina
            status: { $in: ['Completado', 'Enviado'] } // Solo órdenes completadas
        };

        // Filtro por caja específica o caja activa
        if (activeOnly === 'true') {
            const activeCashRegister = await cashRegisterModel.findOne({
                restaurant: req.user.restaurant,
                status: 'Abierta'
            }).select('_id').lean();
            if (activeCashRegister) {
                filters.cashRegister = activeCashRegister._id;
                console.log('📦 Filtrando por caja activa:', activeCashRegister._id);
            } else {
                console.log('⚠️ No hay caja activa, devolviendo vacío');
                // Si no hay caja activa, devolver vacío
                return res.status(200).json({
                    success: true,
                    tips: [],
                    statistics: {
                        totalTips: 0,
                        totalOrders: 0,
                        averageTip: 0,
                        tipsByWaiter: []
                    }
                });
            }
        } else if (cashRegisterId) {
            filters.cashRegister = cashRegisterId;
            console.log('📦 Filtrando por caja específica:', cashRegisterId);
        } else {
            console.log('📦 Sin filtro de caja, buscando en todas las cajas');
        }

        // Filtro por mesero
        if (waiterId && waiterId !== 'all') {
            filters.waiter = waiterId;
            console.log('👤 Filtrando por mesero:', waiterId);
        }

        // Filtro por rango de fechas usando la zona horaria de Chile
        if (dateFrom || dateTo) {
            filters.createdAt = {};
            if (dateFrom) {
                const fromRange = getChileDayRange(dateFrom);
                if (!fromRange) {
                    return res.status(400).json({
                        success: false,
                        message: 'Formato dateFrom inválido. Usa YYYY-MM-DD',
                    });
                }
                filters.createdAt.$gte = fromRange.start;
                console.log('📅 Fecha desde:', fromRange.start);
            }
            if (dateTo) {
                const toRange = getChileDayRange(dateTo);
                if (!toRange) {
                    return res.status(400).json({
                        success: false,
                        message: 'Formato dateTo inválido. Usa YYYY-MM-DD',
                    });
                }
                filters.createdAt.$lte = toRange.end;
                console.log('📅 Fecha hasta:', toRange.end);
            }
        }

        console.log('🔎 Filtros aplicados:', JSON.stringify(filters, null, 2));

        // Obtener órdenes con propinas
        const tips = await orderModel.find(filters)
            .select('tip waiter buyer orderNumber total createdAt status section')
            .populate('waiter', 'userName name')
            .populate('buyer', 'name')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`✅ Se encontraron ${tips.length} órdenes con propinas`);

        // Calcular estadísticas
        const totalTips = tips.reduce((sum, order) => sum + (order.tip || 0), 0);
        const totalOrders = tips.length;
        const averageTip = totalOrders > 0 ? totalTips / totalOrders : 0;

        // Agrupar propinas por mesero
        const tipsByWaiterMap = {};
        tips.forEach(order => {
            if (order.waiter) {
                const waiterId = order.waiter._id.toString();
                if (!tipsByWaiterMap[waiterId]) {
                    tipsByWaiterMap[waiterId] = {
                        waiter: order.waiter,
                        totalTips: 0,
                        orderCount: 0
                    };
                }
                tipsByWaiterMap[waiterId].totalTips += order.tip || 0;
                tipsByWaiterMap[waiterId].orderCount += 1;
            }
        });

        const tipsByWaiter = Object.values(tipsByWaiterMap);

        console.log('💰 Total propinas:', totalTips, '| Promedio:', averageTip);

        res.status(200).json({
            success: true,
            tips,
            statistics: {
                totalTips,
                totalOrders,
                averageTip,
                tipsByWaiter
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener propinas:', error);
        res.status(500).send({
            success: false,
            message: 'Error al obtener las propinas',
            error: error.message,
        });
    }
};

// SOLICITAR IMPRESIÓN DE TICKET DE CLIENTE (desde app)
const printTicketController = async (req, res) => {
    try {
        const accountIndexRaw = req.body?.accountIndex;
        const accountIndex = Number.isInteger(accountIndexRaw)
            ? accountIndexRaw
            : (accountIndexRaw !== undefined ? parseInt(accountIndexRaw, 10) : null);

        const order = await orderModel
            .findOne({ _id: req.params.id, restaurant: req.restaurantId })
            .populate('foods.food', 'title price extraSections')
            .populate('buyer', 'name phone')
            .populate('waiter', 'userName name')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const payloadOrder = Number.isInteger(accountIndex)
            ? { ...order, printSplitAccountIndex: accountIndex }
            : order;

        getIO().to(`restaurant:${req.restaurantId}`).emit('ticket:print', { order: payloadOrder });

        res.json({ success: true });
    } catch (error) {
        console.error('Error al solicitar impresión de ticket:', error);
        res.status(500).json({ success: false, message: 'Error al solicitar impresión', error });
    }
};

module.exports = {
    createOrderController,
    getAllOrdersController,
    updateOrderController,
    updateOrderItemReadyController,
    deleteOrderController,
    getOrderByIdController,
    getOrderByNumberController,
    getFilteredOrders,
    getRecentOrders,
    getSectionOrders,
    getAllSalesController,
    getTipsController,
    printTicketController
};