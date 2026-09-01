const Table = require('../models/tableModel');
const Order = require('../models/orderModel');
const Restaurant = require('../models/restaurantModel');
const { getIO } = require('../socket');
const { deductStockForOrder } = require('../services/inventoryService');

// Obtener todas las mesas del restaurante
const getTables = async (req, res) => {
    try {
        const tables = await Table.find({ restaurant: req.restaurantId })
            .populate('currentOrder')
            .populate('waiter', 'userName email')
            .populate('mergedGroup', 'tableNumber')
            .sort({ tableNumber: 1 });

        res.json(tables);
    } catch (error) {
        console.error('Error al obtener mesas:', error);
        res.status(500).json({ message: 'Error al obtener mesas', error: error.message });
    }
};

// Obtener una mesa específica
const getTableById = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            restaurant: req.restaurantId
        })
            .populate({
                path: 'currentOrder',
                populate: [
                    { path: 'foods.food', model: 'Food', select: 'title price category extraSections' },
                    { path: 'deletedFoods.food', model: 'Food', select: 'title price extraSections' }
                ]
            })
            .populate('waiter', 'userName email')
            .populate('mergedGroup', 'tableNumber');

        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        res.json(table);
    } catch (error) {
        console.error('Error al obtener mesa:', error);
        res.status(500).json({ message: 'Error al obtener mesa', error: error.message });
    }
};

// Crear una nueva mesa
const createTable = async (req, res) => {
    try {
        const { tableNumber, capacity, position, section } = req.body;
        
        // Verificar si ya existe una mesa con ese número
        const existingTable = await Table.findOne({ 
            tableNumber, 
            restaurant: req.restaurantId 
        });
        
        if (existingTable) {
            return res.status(400).json({ message: 'Ya existe una mesa con ese número' });
        }
        
        const table = new Table({
            tableNumber,
            capacity: capacity || 4,
            position: position || { x: 0, y: 0 },
            section: section || 'Salón',
            restaurant: req.restaurantId,
        });
        
        await table.save();
        res.status(201).json(table);
    } catch (error) {
        console.error('Error al crear mesa:', error);
        res.status(500).json({ message: 'Error al crear mesa', error: error.message });
    }
};

// Actualizar mesa
const updateTable = async (req, res) => {
    try {
        const { tableNumber, capacity, status, position, currentGuests, section } = req.body;
        
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        });
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }
        
        // Si se cambia el número de mesa, verificar que no exista otra con ese número
        if (tableNumber && tableNumber !== table.tableNumber) {
            const existingTable = await Table.findOne({ 
                tableNumber, 
                restaurant: req.restaurantId,
                _id: { $ne: req.params.id }
            });
            
            if (existingTable) {
                return res.status(400).json({ message: 'Ya existe una mesa con ese número' });
            }
            table.tableNumber = tableNumber;
        }
        
        if (capacity !== undefined) table.capacity = capacity;
        if (status !== undefined) table.status = status;
        if (position !== undefined) table.position = position;
        if (currentGuests !== undefined) table.currentGuests = currentGuests;
        if (section !== undefined) table.section = section;
        
        await table.save();
        res.json(table);
    } catch (error) {
        console.error('Error al actualizar mesa:', error);
        res.status(500).json({ message: 'Error al actualizar mesa', error: error.message });
    }
};

// Eliminar mesa
const deleteTable = async (req, res) => {
    try {
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        });
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }
        
        // No permitir eliminar mesas ocupadas
        if (table.status === 'occupied' && table.currentOrder) {
            return res.status(400).json({ message: 'No se puede eliminar una mesa ocupada' });
        }
        
        await table.deleteOne();
        res.json({ message: 'Mesa eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar mesa:', error);
        res.status(500).json({ message: 'Error al eliminar mesa', error: error.message });
    }
};

// Abrir mesa
const openTable = async (req, res) => {
    try {
        const { currentGuests, waiter } = req.body;

        let table = await Table.findOne({
            _id: req.params.id,
            restaurant: req.restaurantId
        });

        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Si es una mesa secundaria de un grupo unido, se abre la mesa principal
        if (table.mergedInto) {
            table = await Table.findOne({ _id: table.mergedInto, restaurant: req.restaurantId });
            if (!table) {
                return res.status(404).json({ message: 'Mesa principal no encontrada' });
            }
        }

        if (table.status === 'occupied') {
            return res.status(400).json({ message: 'La mesa ya está ocupada' });
        }
        
        table.status = 'occupied';
        table.currentGuests = currentGuests || 0;
        table.openedAt = new Date();
        if (waiter) table.waiter = waiter;
        
        await table.save();
        
        const populatedTable = await Table.findById(table._id)
            .populate('waiter', 'userName email')
            .populate('currentOrder')
            .populate('mergedGroup', 'tableNumber');

        try {
            getIO().to(`restaurant:${req.restaurantId}`).emit('table:updated', { table: populatedTable });
        } catch (socketErr) {
            console.error('Error emitiendo socket table:updated:', socketErr.message);
        }

        res.json(populatedTable);
    } catch (error) {
        console.error('Error al abrir mesa:', error);
        res.status(500).json({ message: 'Error al abrir mesa', error: error.message });
    }
};

// Cerrar mesa
const closeTable = async (req, res) => {
    try {
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        }).populate('currentOrder');
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        const restaurant = await Restaurant.findById(req.restaurantId).select('settings');
        const settings = Restaurant.normalizeSettings(restaurant?.settings || {});
        const onlyOwnerCanCloseTable = Boolean(settings?.permissions?.onlyOwnerCanCloseTable);
        const userRole = req.user?.role;
        const tableHasNoProducts = !Array.isArray(table.currentOrder?.foods) || table.currentOrder.foods.length === 0;

        if (onlyOwnerCanCloseTable && userRole !== 'owner' && userRole !== 'super_admin' && !tableHasNoProducts) {
            return res.status(403).json({
                message: 'Solo el dueño puede cerrar mesas con productos según la configuración del restaurante.',
            });
        }

        const kitchenDisplayEnabled = Boolean(settings?.kitchenDisplay?.enabled);
        const requireKitchenReadyToClose = Boolean(settings?.kitchenDisplay?.requireReadyToClose);
        const orderNeedsKitchenReady =
            table.currentOrder &&
            table.currentOrder.status !== 'Completado' &&
            table.currentOrder.status !== 'Cancelado' &&
            !tableHasNoProducts;

        if (kitchenDisplayEnabled && requireKitchenReadyToClose && orderNeedsKitchenReady && !table.currentOrder.kitchenReadyAt) {
            return res.status(409).json({
                message: 'El pedido aún no está listo en cocina',
            });
        }

        // Si hay una orden, completarla primero
        let completedOrder = null;
        if (table.currentOrder) {
            const order = await Order.findById(table.currentOrder._id);
            if (order && order.status !== 'Completado' && order.status !== 'Cancelado') {
                order.status = 'Completado';
                await order.save();
                completedOrder = order;

                // Descontar inventario (fire-and-forget)
                deductStockForOrder(order._id, req.restaurantId).catch(err =>
                    console.error('Error al descontar inventario al cerrar mesa:', err)
                );
            }
        }
        
        table.status = 'available';
        table.currentGuests = 0;
        table.currentOrder = null;
        table.openedAt = null;
        table.waiter = null;

        // Si esta mesa era la principal de un grupo unido, el grupo pierde su
        // razón de ser al cerrarse la cuenta: se liberan también las secundarias.
        let releasedSecondaries = [];
        if (!table.mergedInto && Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0) {
            const secondaryIds = table.mergedGroup;
            table.mergedGroup = [];
            await Table.updateMany(
                { _id: { $in: secondaryIds }, restaurant: req.restaurantId },
                {
                    $set: {
                        mergedInto: null,
                        mergedGroup: [],
                        currentOrder: null,
                        status: 'available',
                        currentGuests: 0,
                        openedAt: null,
                        waiter: null,
                    },
                }
            );
            releasedSecondaries = await Table.find({ _id: { $in: secondaryIds }, restaurant: req.restaurantId });
        }

        await table.save();

        try {
            const io = getIO();
            io.to(`restaurant:${req.restaurantId}`).emit('table:updated', { table });
            releasedSecondaries.forEach((secondaryTable) => {
                io.to(`restaurant:${req.restaurantId}`).emit('table:updated', { table: secondaryTable });
            });

            // Cerrar la mesa completa la orden aquí mismo: sin este evento la
            // pantalla de cocina seguiría mostrando un pedido ya cobrado hasta
            // la próxima resincronización.
            if (completedOrder) {
                const populatedOrder = await Order.findById(completedOrder._id)
                    .populate('foods.food', 'title price category extraSections')
                    .populate('deletedFoods.food', 'title price extraSections')
                    .populate('buyer', 'name phone')
                    .populate('waiter', 'userName name')
                    .lean();
                if (populatedOrder) {
                    io.to(`restaurant:${req.restaurantId}`).emit('order:updated', {
                        order: populatedOrder,
                        _fromSocketId: req.headers['x-socket-id'] || null,
                    });
                }
            }
        } catch (socketErr) {
            console.error('Error emitiendo socket table:updated:', socketErr.message);
        }

        res.json(table);
    } catch (error) {
        console.error('Error al cerrar mesa:', error);
        res.status(500).json({ message: 'Error al cerrar mesa', error: error.message });
    }
};

// Actualizar posiciones de las mesas
const updateTablePositions = async (req, res) => {
    try {
        const { tables } = req.body;
        
        if (!Array.isArray(tables)) {
            return res.status(400).json({ message: 'Se requiere un array de mesas' });
        }
        
        const updatePromises = tables.map(({ id, position }) => 
            Table.findOneAndUpdate(
                { _id: id, restaurant: req.restaurantId },
                { position },
                { new: true }
            )
        );
        
        await Promise.all(updatePromises);
        
        const updatedTables = await Table.find({ restaurant: req.restaurantId })
            .populate('currentOrder')
            .populate('waiter', 'userName email')
            .populate('mergedGroup', 'tableNumber')
            .sort({ tableNumber: 1 });
        
        res.json(updatedTables);
    } catch (error) {
        console.error('Error al actualizar posiciones:', error);
        res.status(500).json({ message: 'Error al actualizar posiciones', error: error.message });
    }
};

// Asignar orden a mesa
const assignOrderToTable = async (req, res) => {
    try {
        const { orderId } = req.body;

        let table = await Table.findOne({
            _id: req.params.id,
            restaurant: req.restaurantId
        });

        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        // Si la mesa es secundaria de un grupo unido, la orden se asigna a la mesa principal
        if (table.mergedInto) {
            table = await Table.findOne({ _id: table.mergedInto, restaurant: req.restaurantId });
            if (!table) {
                return res.status(404).json({ message: 'Mesa principal no encontrada' });
            }
        }

        if (table.currentOrder && table.currentOrder.toString() === orderId) {
            const populatedTable = await Table.findById(table._id)
                .populate({
                    path: 'currentOrder',
                    populate: {
                        path: 'foods.food',
                        model: 'Food',
                        select: 'title price category extraSections'
                    }
                })
                .populate('waiter', 'userName email')
                .populate('mergedGroup', 'tableNumber');
            return res.json(populatedTable);
        }

        if (table.currentOrder) {
            const currentOrder = await Order.findById(table.currentOrder)
                .select('status orderNumber')
                .lean();
            if (currentOrder && !['Completado', 'Cancelado'].includes(currentOrder.status)) {
                return res.status(409).json({
                    message: 'La mesa ya tiene un pedido en curso',
                    orderId: currentOrder._id,
                    orderNumber: currentOrder.orderNumber,
                });
            }
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }
        
        table.currentOrder = orderId;
        if (table.status === 'available') {
            table.status = 'occupied';
            table.openedAt = new Date();
        }
        
        await table.save();
        
        const populatedTable = await Table.findById(table._id)
            .populate({
                path: 'currentOrder',
                populate: {
                    path: 'foods.food',
                    model: 'Food',
                    select: 'title price category extraSections'
                }
            })
            .populate('waiter', 'userName email')
            .populate('mergedGroup', 'tableNumber');

        try {
            getIO().to(`restaurant:${req.restaurantId}`).emit('table:updated', { table: populatedTable });
        } catch (socketErr) {
            console.error('Error emitiendo socket table:updated:', socketErr.message);
        }

        res.json(populatedTable);
    } catch (error) {
        console.error('Error al asignar orden:', error);
        res.status(500).json({ message: 'Error al asignar orden', error: error.message });
    }
};

// Asignar mesero a mesa
const assignWaiterToTable = async (req, res) => {
    try {
        const { waiterId } = req.body;
        
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        });
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }
        
        table.waiter = waiterId || null;
        await table.save();
        
        const populatedTable = await Table.findById(table._id)
            .populate({
                path: 'currentOrder',
                populate: {
                    path: 'foods.food',
                    model: 'Food',
                    select: 'title price category extraSections'
                }
            })
            .populate('waiter', 'name email');
        
        res.json(populatedTable);
    } catch (error) {
        console.error('Error al asignar mesero:', error);
        res.status(500).json({ message: 'Error al asignar mesero', error: error.message });
    }
};

const populateForBroadcast = (query) => query
    .populate({
        path: 'currentOrder',
        populate: { path: 'foods.food', model: 'Food', select: 'title price category extraSections' },
    })
    .populate('waiter', 'userName email')
    .populate('mergedGroup', 'tableNumber');

const emitTableUpdated = (restaurantId, table) => {
    try {
        getIO().to(`restaurant:${restaurantId}`).emit('table:updated', { table });
    } catch (socketErr) {
        console.error('Error emitiendo socket table:updated:', socketErr.message);
    }
};

// Unir varias mesas en un solo grupo con una cuenta compartida
const mergeTables = async (req, res) => {
    try {
        const { tableIds } = req.body;

        if (!Array.isArray(tableIds) || tableIds.length < 2) {
            return res.status(400).json({ message: 'Se requieren al menos 2 mesas para unir' });
        }

        const tables = await Table.find({
            _id: { $in: tableIds },
            restaurant: req.restaurantId,
        });

        if (tables.length !== tableIds.length) {
            return res.status(404).json({ message: 'Una o más mesas no fueron encontradas' });
        }

        const alreadyGrouped = tables.find((t) => Array.isArray(t.mergedGroup) && t.mergedGroup.length > 0);
        if (alreadyGrouped) {
            return res.status(400).json({
                message: `La mesa ${alreadyGrouped.tableNumber} ya está unida a otro grupo. Sepárala primero.`,
            });
        }

        const primary = tables.reduce((min, t) => (t.tableNumber < min.tableNumber ? t : min), tables[0]);
        const secondaries = tables.filter((t) => t._id.toString() !== primary._id.toString());

        // Resolver cuál orden activa (si alguna) queda como la compartida
        const activeOrderStatuses = ['Completado', 'Cancelado'];
        const getActiveOrder = async (table) => {
            if (!table.currentOrder) return null;
            const order = await Order.findById(table.currentOrder).select('status').lean();
            if (order && !activeOrderStatuses.includes(order.status)) return order;
            return null;
        };

        let sharedOrder = await getActiveOrder(primary);
        if (!sharedOrder) {
            const secondaryActiveOrders = [];
            for (const secondary of secondaries) {
                const activeOrder = await getActiveOrder(secondary);
                if (activeOrder) secondaryActiveOrders.push({ secondary, activeOrder });
            }
            if (secondaryActiveOrders.length > 1) {
                return res.status(409).json({
                    message: 'Varias mesas seleccionadas tienen pedidos activos distintos. Cierra o unifica los pedidos antes de unir las mesas.',
                });
            }
            if (secondaryActiveOrders.length === 1) {
                sharedOrder = secondaryActiveOrders[0].activeOrder;
            }
        }

        const groupIds = tables.map((t) => t._id);

        primary.currentOrder = sharedOrder ? sharedOrder._id : primary.currentOrder;
        primary.mergedInto = null;
        primary.mergedGroup = groupIds.filter((id) => id.toString() !== primary._id.toString());
        if (sharedOrder && primary.status !== 'occupied') {
            primary.status = 'occupied';
            primary.openedAt = primary.openedAt || new Date();
        }
        await primary.save();

        for (const secondary of secondaries) {
            secondary.mergedInto = primary._id;
            secondary.mergedGroup = groupIds.filter((id) => id.toString() !== secondary._id.toString());
            secondary.currentOrder = null;
            secondary.status = sharedOrder ? 'occupied' : secondary.status;
            if (sharedOrder) secondary.openedAt = secondary.openedAt || new Date();
            await secondary.save();
        }

        const populatedTables = await populateForBroadcast(
            Table.find({ _id: { $in: groupIds } })
        );

        populatedTables.forEach((t) => emitTableUpdated(req.restaurantId, t));

        res.json({ primaryTableId: primary._id, tables: populatedTables });
    } catch (error) {
        console.error('Error al unir mesas:', error);
        res.status(500).json({ message: 'Error al unir mesas', error: error.message });
    }
};

// Separar una o más mesas de su grupo unido
const splitTable = async (req, res) => {
    try {
        const { tableIds } = req.body;

        const table = await Table.findOne({
            _id: req.params.id,
            restaurant: req.restaurantId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
        }

        if (!Array.isArray(table.mergedGroup) || table.mergedGroup.length === 0) {
            return res.status(400).json({ message: 'La mesa no forma parte de un grupo unido' });
        }

        const primaryId = table.mergedInto || table._id;
        const primary = table.mergedInto
            ? await Table.findOne({ _id: primaryId, restaurant: req.restaurantId })
            : table;

        if (!primary) {
            return res.status(404).json({ message: 'Mesa principal no encontrada' });
        }

        const allSecondaryIds = primary.mergedGroup.map((id) => id.toString());
        const idsToRelease = Array.isArray(tableIds) && tableIds.length > 0
            ? tableIds.map(String).filter((id) => allSecondaryIds.includes(id))
            : allSecondaryIds;

        if (idsToRelease.length === 0) {
            return res.status(400).json({ message: 'No hay mesas secundarias para separar' });
        }

        await Table.updateMany(
            { _id: { $in: idsToRelease }, restaurant: req.restaurantId },
            {
                $set: {
                    mergedInto: null,
                    mergedGroup: [],
                    currentOrder: null,
                    status: 'available',
                    currentGuests: 0,
                    openedAt: null,
                    waiter: null,
                },
            }
        );

        const remainingSecondaries = allSecondaryIds.filter((id) => !idsToRelease.includes(id));
        primary.mergedGroup = remainingSecondaries;
        if (remainingSecondaries.length === 0) {
            // El grupo quedó con un solo miembro: se disuelve por completo
            primary.mergedGroup = [];
        }
        await primary.save();

        const affectedIds = [primary._id.toString(), ...idsToRelease];
        const populatedTables = await populateForBroadcast(
            Table.find({ _id: { $in: affectedIds } })
        );

        populatedTables.forEach((t) => emitTableUpdated(req.restaurantId, t));

        res.json({ tables: populatedTables });
    } catch (error) {
        console.error('Error al separar mesas:', error);
        res.status(500).json({ message: 'Error al separar mesas', error: error.message });
    }
};

module.exports = {
    getTables,
    getTableById,
    createTable,
    updateTable,
    deleteTable,
    openTable,
    closeTable,
    updateTablePositions,
    assignOrderToTable,
    assignWaiterToTable,
    mergeTables,
    splitTable,
};
