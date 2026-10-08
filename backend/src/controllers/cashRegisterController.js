const cashRegisterModel = require('../models/cashRegisterModel');
const cashMovementModel = require('../models/cashMovementModel');
const { CASH_MOVEMENT_TYPES } = require('../models/cashMovementModel');
const subscriptionModel = require('../models/subscriptionModel');
const userModel = require('../models/userModel');
const { getChileDayRange } = require('../utils/dateUtils');
const { getIO } = require('../socket');


// Create a new cash register
const createCashRegister = async (req, res) => {
    try {
        const { initialBalance } = req.body;
        
        // Verificar suscripción activa antes de permitir abrir caja
        const activeSubscription = await subscriptionModel.findOne({
            restaurant: req.user.restaurant,
            status: { $in: ['active', 'trial'] },
            endDate: { $gte: new Date() }
        });

        if (!activeSubscription) {
            return res.status(403).send({ 
                success: false, 
                message: 'No tienes una suscripción activa. Por favor suscríbete para poder abrir caja.',
                requiresSubscription: true
            });
        }

        const newCashRegister = new cashRegisterModel({
            restaurant: req.user.restaurant,
            initialBalance,
        });
        await newCashRegister.save();
        res.status(201).send({ success: true, message: 'Caja creada', newCashRegister });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al crear caja', error });
    }
};


// Get the current cash register for a restaurant
const getCurrentCashRegister = async (req, res) => {
    try {
        const cashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });
        if (!cashRegister) {
            return res.status(404).send({ success: false, message: 'Caja no encontrada' });
        }

        // Obtener estadísticas actualizadas desde las órdenes reales (solo completadas o enviadas)
        const orderModel = require('../models/orderModel');
        const completedOrders = await orderModel.find({
            restaurant: req.user.restaurant,
            cashRegister: cashRegister._id,
            status: { $in: ['Completado', 'Enviado'] },
            createdAt: { $gte: cashRegister.dateOpened }
        });

        const systemTotal = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

        // Actualizar el amountSystem en la caja para mantenerlo sincronizado
        if (cashRegister.amountSystem !== systemTotal) {
            cashRegister.amountSystem = systemTotal;
            await cashRegister.save();
        }

        res.status(200).send({ 
            success: true, 
            cashRegister,
            statistics: {
                totalOrders: completedOrders.length,
                systemTotal,
                averageTicket: completedOrders.length > 0 ? systemTotal / completedOrders.length : 0
            }
        });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al obtener caja', error });
    }
};


// Update amount system and close cash register
const closeCashRegister = async (req, res) => {
    try {
        const { officialIncome, comment } = req.body;
        
        const orderModel = require('../models/orderModel');

        // Buscar la caja activa
        const activeCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta'
        });

        if (!activeCashRegister) {
            return res.status(404).send({ success: false, message: 'No hay una caja activa para cerrar' });
        }

        // Pedidos en preparación que bloquean el cierre. Acotado a esta caja: un
        // pedido que quedó colgado en una jornada anterior no tiene por qué impedir
        // cerrar hoy, y sin este filtro bloqueaba el cierre indefinidamente. Se
        // devuelven los números para que se sepa cuál revisar.
        const pendingOrders = await orderModel
            .find({
                restaurant: req.user.restaurant,
                cashRegister: activeCashRegister._id,
                status: 'Preparacion'
            })
            .select('orderNumber section tableNumber')
            .lean();

        if (pendingOrders.length > 0) {
            const detalle = pendingOrders
                .map((o) => `#${o.orderNumber}${o.tableNumber ? ` (mesa ${o.tableNumber})` : ` (${o.section})`}`)
                .join(', ');

            return res.status(400).send({
                success: false,
                message: `Hay ${pendingOrders.length} pedido${pendingOrders.length > 1 ? 's' : ''} en preparación: ${detalle}`,
                pendingOrdersCount: pendingOrders.length,
                pendingOrders
            });
        }

        // Calcular el total del sistema basado en las órdenes reales de esta caja
        const ordersInCash = await orderModel.find({
            restaurant: req.user.restaurant,
            cashRegister: activeCashRegister._id,
            status: { $in: ['Completado', 'Enviado'] }, // Solo contar órdenes completadas o enviadas
            createdAt: { $gte: activeCashRegister.dateOpened }
        });

        const systemTotal = ordersInCash.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalReal = Object.values(officialIncome).reduce((sum, value) => sum + parseFloat(value || 0), 0);

        // Actualizar y cerrar la caja
        const cashRegister = await cashRegisterModel.findByIdAndUpdate(
            activeCashRegister._id,
            {
                amountSystem: systemTotal, // Total calculado desde las órdenes reales
                officialIncome, // Guardar los ingresos oficiales
                comment: comment || '', // Guardar el comentario
                status: 'Cerrada',
                dateClosed: new Date(),
            },
            { new: true }
        );

        res.status(200).send({ 
            success: true, 
            message: 'Caja cerrada', 
            cashRegister,
            statistics: {
                totalOrders: ordersInCash.length,
                systemTotal,
                officialTotal: totalReal,
                difference: systemTotal - totalReal
            }
        });
    } catch (error) {
        console.error('Error al cerrar caja:', error);
        res.status(500).send({ success: false, message: 'Error al cerrar caja', error });
    }
};

// Get all cash registers for a restaurant
const getAllCashRegisters = async (req, res) => {
    try {
        const cashRegisters = await cashRegisterModel.find({ restaurant: req.user.restaurant });
        res.status(200).send({ success: true, cashRegisters });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al obtener cajas', error });
    }
};

// Get a specific cash register by ID
const getCashRegisterById = async (req, res) => {
    try {
        const cashRegister = await cashRegisterModel.findById(req.params.id);
        if (!cashRegister) {
            return res.status(404).send({ success: false, message: 'Caja no encontrada' });
        }
        res.status(200).send({ success: true, cashRegister });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al obtener caja', error });
    }
};






// Registrar un movimiento manual de caja (ingreso o egreso que no proviene de una venta)
const addCashMovement = async (req, res) => {
    try {
        const { type, amount, description, cashRegisterId } = req.body;

        if (!CASH_MOVEMENT_TYPES.includes(type)) {
            return res.status(400).send({
                success: false,
                message: 'Tipo de movimiento inválido. Usa Ingreso o Egreso',
            });
        }

        const parsedAmount = parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).send({ success: false, message: 'El monto debe ser un número mayor a 0' });
        }

        // El movimiento siempre pertenece a una caja: si no se indica una, se usa la caja abierta.
        let cashRegister;
        if (cashRegisterId) {
            cashRegister = await cashRegisterModel.findOne({
                _id: cashRegisterId,
                restaurant: req.user.restaurant,
            });
        } else {
            cashRegister = await cashRegisterModel.findOne({
                restaurant: req.user.restaurant,
                status: 'Abierta',
            });
        }

        if (!cashRegister) {
            return res.status(404).send({
                success: false,
                message: cashRegisterId ? 'Caja no encontrada' : 'No hay una caja abierta para registrar el movimiento',
            });
        }

        if (cashRegister.status === 'Cerrada') {
            return res.status(400).send({
                success: false,
                message: 'No se pueden registrar movimientos en una caja cerrada',
            });
        }

        const user = await userModel.findById(req.user.id).select('userName name').lean();

        const newMovement = await cashMovementModel.create({
            restaurant: req.user.restaurant,
            cashRegister: cashRegister._id,
            type,
            amount: parsedAmount,
            description: (description || '').trim(),
            createdBy: req.user.id || null,
            createdByName: user?.userName || user?.name || '',
        });

        // Avisar a los demás dispositivos para que refresquen el detalle de caja
        try {
            getIO().to('restaurant:' + req.user.restaurant).emit('cashmovement:created', {
                movement: newMovement,
                cashRegisterId: cashRegister._id.toString(),
                _fromSocketId: req.headers['x-socket-id'] || null,
            });
        } catch (socketError) {
            console.error('Error al emitir cashmovement:created:', socketError.message);
        }

        res.status(201).send({ success: true, message: 'Movimiento registrado', movement: newMovement });
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).send({ success: false, message: 'Error al registrar movimiento', error: error.message });
    }
};

// Totales de un conjunto de movimientos (usado por el detalle de caja y el reporte impreso)
const buildMovementStatistics = (movements) => {
    const statistics = {
        totalIncome: 0,
        totalExpense: 0,
        netTotal: 0,
        incomeCount: 0,
        expenseCount: 0,
    };

    movements.forEach((movement) => {
        const amount = movement.amount || 0;
        if (movement.type === 'Ingreso') {
            statistics.totalIncome += amount;
            statistics.incomeCount += 1;
        } else if (movement.type === 'Egreso') {
            statistics.totalExpense += amount;
            statistics.expenseCount += 1;
        }
    });

    statistics.netTotal = statistics.totalIncome - statistics.totalExpense;
    return statistics;
};

// Obtener los movimientos de caja (por caja específica, por caja abierta o por rango de fechas)
const getCashMovements = async (req, res) => {
    try {
        const { startDate, endDate, cashRegisterId, type } = req.query;
        const filters = { restaurant: req.user.restaurant };

        if (cashRegisterId) {
            filters.cashRegister = cashRegisterId;
        }

        if (type && CASH_MOVEMENT_TYPES.includes(type)) {
            filters.type = type;
        }

        const dateFilter = {};

        if (startDate) {
            const fromRange = getChileDayRange(startDate);
            if (!fromRange) {
                return res.status(400).send({
                    success: false,
                    message: 'Formato startDate inválido. Usa YYYY-MM-DD',
                });
            }
            dateFilter.$gte = fromRange.start;
        }

        if (endDate) {
            const toRange = getChileDayRange(endDate);
            if (!toRange) {
                return res.status(400).send({
                    success: false,
                    message: 'Formato endDate inválido. Usa YYYY-MM-DD',
                });
            }
            dateFilter.$lte = toRange.end;
        }

        if (Object.keys(dateFilter).length) {
            filters.createdAt = dateFilter;
        }

        const movements = await cashMovementModel.find(filters)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'userName name')
            .lean();

        res.status(200).send({
            success: true,
            movements,
            statistics: buildMovementStatistics(movements),
        });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).send({ success: false, message: 'Error al obtener movimientos', error: error.message });
    }
};

// Eliminar un movimiento de caja (solo mientras la caja siga abierta)
const deleteCashMovement = async (req, res) => {
    try {
        const movement = await cashMovementModel.findOne({
            _id: req.params.id,
            restaurant: req.user.restaurant,
        });

        if (!movement) {
            return res.status(404).send({ success: false, message: 'Movimiento no encontrado' });
        }

        const cashRegister = await cashRegisterModel.findById(movement.cashRegister);
        if (cashRegister && cashRegister.status === 'Cerrada') {
            return res.status(400).send({
                success: false,
                message: 'No se pueden eliminar movimientos de una caja cerrada',
            });
        }

        await movement.deleteOne();

        try {
            getIO().to('restaurant:' + req.user.restaurant).emit('cashmovement:deleted', {
                movementId: movement._id.toString(),
                cashRegisterId: movement.cashRegister.toString(),
                _fromSocketId: req.headers['x-socket-id'] || null,
            });
        } catch (socketError) {
            console.error('Error al emitir cashmovement:deleted:', socketError.message);
        }

        res.status(200).send({ success: true, message: 'Movimiento eliminado' });
    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(500).send({ success: false, message: 'Error al eliminar movimiento', error: error.message });
    }
};



// Obtener las ventas (órdenes) de una caja registradora específica
const getCashRegisterSales = async (req, res) => {
    try {
        const { cashRegisterId } = req.params;
        const { status, section, paymentMethod, dateFrom, dateTo } = req.query;

        // Verificar que la caja existe y pertenece al restaurante
        const cashRegister = await cashRegisterModel.findOne({
            _id: cashRegisterId,
            restaurant: req.user.restaurant,
        });

        if (!cashRegister) {
            return res.status(404).send({ success: false, message: 'Caja registradora no encontrada' });
        }

        // Construir filtros para las órdenes
        const orderModel = require('../models/orderModel');
        const filters = {
            restaurant: req.user.restaurant,
            cashRegister: cashRegisterId,
            status: { $in: ['Completado', 'Enviado'] } // Solo órdenes completadas o enviadas
        };

        // Agregar filtros opcionales (pero mantener restricción de estados válidos)
        if (status && ['Completado', 'Enviado'].includes(status)) {
            filters.status = status; // Solo permitir filtrar por estados válidos para caja
        }
        if (section) filters.section = section;
        if (paymentMethod) filters.payment = paymentMethod;

        // Filtros de fecha
        if (dateFrom || dateTo) {
            filters.createdAt = {};
            if (dateFrom) {
                const fromRange = getChileDayRange(dateFrom);
                if (!fromRange) {
                    return res.status(400).send({
                        success: false,
                        message: 'Formato dateFrom inválido. Usa YYYY-MM-DD',
                    });
                }
                filters.createdAt.$gte = fromRange.start;
            }
            if (dateTo) {
                const toRange = getChileDayRange(dateTo);
                if (!toRange) {
                    return res.status(400).send({
                        success: false,
                        message: 'Formato dateTo inválido. Usa YYYY-MM-DD',
                    });
                }
                filters.createdAt.$lte = toRange.end;
            }
        }

        // Si no hay filtros de fecha y la caja está cerrada, filtrar por fechas de apertura y cierre
        if (!dateFrom && !dateTo && cashRegister.status === 'Cerrada') {
            filters.createdAt = {
                $gte: cashRegister.dateOpened,
                $lte: cashRegister.dateClosed || new Date(),
            };
        } else if (!dateFrom && !dateTo && cashRegister.status === 'Abierta') {
            // Si la caja está abierta, filtrar desde la fecha de apertura
            filters.createdAt = {
                $gte: cashRegister.dateOpened,
            };
        }

        const orders = await orderModel.find(filters)
            .sort({ updatedAt: -1 })
            .populate('foods.food', 'title price extraSections')
            .populate('deletedFoods.food', 'title price extraSections')
            .populate('buyer', 'name phone')
            .populate('waiter', 'userName name');

        // Obtener pedidos cancelados de la misma caja y rango para control administrativo.
        const canceledFilters = {
            ...filters,
            status: 'Cancelado',
        };
        const canceledOrders = await orderModel.find(canceledFilters).select('total');
        const canceledTotal = canceledOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const canceledOrdersCount = canceledOrders.length;

        // Movimientos manuales de caja (ingresos/egresos que no son ventas)
        const movements = await cashMovementModel.find({
            restaurant: req.user.restaurant,
            cashRegister: cashRegisterId,
        })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'userName name')
            .lean();
        const movementStatistics = buildMovementStatistics(movements);

        // Calcular estadísticas
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;

        res.status(200).send({
            success: true,
            message: 'Ventas de la caja obtenidas correctamente',
            cashRegister,
            orders,
            movements,
            statistics: {
                totalSales,
                totalOrders,
                averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
                canceledTotal,
                canceledOrders: canceledOrdersCount,
                totalIncome: movementStatistics.totalIncome,
                totalExpense: movementStatistics.totalExpense,
                netMovements: movementStatistics.netTotal,
                incomeCount: movementStatistics.incomeCount,
                expenseCount: movementStatistics.expenseCount,
            }
        });
    } catch (error) {
        console.error('Error al obtener ventas de la caja:', error);
        res.status(500).send({ success: false, message: 'Error al obtener ventas de la caja', error });
    }
};

// Obtener las ventas de la caja activa actual
const getCurrentCashRegisterSales = async (req, res) => {
    try {
        // Buscar la caja activa
        const activeCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        if (!activeCashRegister) {
            return res.status(404).send({ success: false, message: 'No hay una caja activa' });
        }

        // Redirigir a getCashRegisterSales con el ID de la caja activa
        req.params.cashRegisterId = activeCashRegister._id.toString();
        return getCashRegisterSales(req, res);
    } catch (error) {
        console.error('Error al obtener ventas de la caja activa:', error);
        res.status(500).send({ success: false, message: 'Error al obtener ventas de la caja activa', error });
    }
};



// RETRANSMITIR REPORTE DE CAJA YA ARMADO POR EL CLIENTE A LOS DEMÁS DISPOSITIVOS
const broadcastCashRegisterReport = async (req, res) => {
    try {
        const { cashRegister, systemTotalsByPayment, tipsStatistics, movements } = req.body || {};
        if (!cashRegister) {
            return res.status(400).send({ success: false, message: 'cashRegister es requerido' });
        }

        const senderSocketId = req.headers['x-socket-id'] || null;
        getIO().to(`restaurant:${req.restaurantId}`).emit('cashregister:print', {
            cashRegister,
            systemTotalsByPayment: systemTotalsByPayment || {},
            tipsStatistics: tipsStatistics || null,
            movements: Array.isArray(movements) ? movements : [],
            _fromSocketId: senderSocketId,
        });

        res.send({ success: true });
    } catch (error) {
        console.error('Error al retransmitir reporte de caja:', error);
        res.status(500).send({ success: false, message: 'Error al retransmitir reporte de caja', error: error.message });
    }
};

module.exports = {
    createCashRegister,
    getCurrentCashRegister,
    closeCashRegister,
    getAllCashRegisters,
    getCashRegisterById,
    addCashMovement,
    getCashMovements,
    deleteCashMovement,
    getCashRegisterSales,
    getCurrentCashRegisterSales,
    broadcastCashRegisterReport,
};