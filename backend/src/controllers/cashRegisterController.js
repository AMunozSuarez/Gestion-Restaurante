const cashRegisterModel = require('../models/cashRegisterModel');
const subscriptionModel = require('../models/subscriptionModel');


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
        
        // Verificar si hay pedidos en preparación
        const orderModel = require('../models/orderModel');
        const pendingOrders = await orderModel.find({
            restaurant: req.user.restaurant,
            status: 'Preparacion'
        });
        
        if (pendingOrders.length > 0) {
            return res.status(400).send({ 
                success: false, 
                message: 'Hay pedidos en preparación', 
                pendingOrdersCount: pendingOrders.length 
            });
        }
        
        // Buscar la caja activa
        const activeCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta'
        });

        if (!activeCashRegister) {
            return res.status(404).send({ success: false, message: 'No hay una caja activa para cerrar' });
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






// Add a new cash movement
const addCashMovement = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        const newMovement = new cashRegisterModel({
            restaurant: req.user.restaurant,
            type,
            amount,
            description,
        });
        await newMovement.save();
        res.status(201).send({ success: true, message: 'Movimiento registrado', newMovement });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al registrar movimiento', error });
    }
};



// Get all cash movements for a restaurant
const getCashMovements = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const movements = await cashRegisterModel.find({
            restaurant: req.user.restaurant,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        });
        res.status(200).send({ success: true, movements });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al obtener movimientos', error });
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
                const startDate = new Date(dateFrom + 'T00:00:00-03:00');
                filters.createdAt.$gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo + 'T23:59:59.999-03:00');
                filters.createdAt.$lte = endDate;
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
            .populate('foods.food', 'title price')
            .populate('deletedFoods.food', 'title price')
            .populate('buyer', 'name phone')
            .populate('waiter', 'userName name');

        // Calcular estadísticas
        const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;

        res.status(200).send({
            success: true,
            message: 'Ventas de la caja obtenidas correctamente',
            cashRegister,
            orders,
            statistics: {
                totalSales,
                totalOrders,
                averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
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



module.exports = {
    createCashRegister,
    getCurrentCashRegister,
    closeCashRegister,
    getAllCashRegisters,
    getCashRegisterById,
    addCashMovement,
    getCashMovements,
    getCashRegisterSales,
    getCurrentCashRegisterSales,
};