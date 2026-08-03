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
            .populate('waiter', 'userName email');

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
        
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        });
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
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
            .populate('currentOrder');

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
        if (table.currentOrder) {
            const order = await Order.findById(table.currentOrder._id);
            if (order && order.status !== 'Completado' && order.status !== 'Cancelado') {
                order.status = 'Completado';
                await order.save();

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
        
        await table.save();

        try {
            getIO().to(`restaurant:${req.restaurantId}`).emit('table:updated', { table });
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
        
        const table = await Table.findOne({ 
            _id: req.params.id, 
            restaurant: req.restaurantId 
        });
        
        if (!table) {
            return res.status(404).json({ message: 'Mesa no encontrada' });
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
                .populate('waiter', 'userName email');
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
            .populate('waiter', 'userName email');

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
};
