const cashRegisterModel = require('../models/cashRegisterModel');


// Create a new cash register
const createCashRegister = async (req, res) => {
    try {
        const { initialBalance } = req.body;
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
        res.status(200).send({ success: true, cashRegister });
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
        
        const totalReal = Object.values(officialIncome).reduce((sum, value) => sum + parseFloat(value || 0), 0);

        const cashRegister = await cashRegisterModel.findOneAndUpdate(
            { restaurant: req.user.restaurant, status: 'Abierta' },
            {
                amountSystem: totalReal,
                officialIncome, // Guardar los ingresos oficiales
                comment: comment || '', // Guardar el comentario
                status: 'Cerrada',
                dateClosed: new Date(),
            },
            { new: true }
        );

        if (!cashRegister) {
            return res.status(404).send({ success: false, message: 'Caja no encontrada' });
        }

        res.status(200).send({ success: true, message: 'Caja cerrada', cashRegister });
    } catch (error) {
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



// Add completed order to current cash register
const addOrderToCashRegister = async (req, res) => {
    try {
        const { orderId, total, paymentMethod, paymentMethods, items } = req.body;

        // Buscar la caja activa
        const activeCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        if (!activeCashRegister) {
            return res.status(400).send({ success: false, message: 'No hay una caja activa.' });
        }

        // Crear el registro del pedido para la caja
        const orderEntry = {
            orderId,
            total: parseFloat(total) || 0,
            paymentMethod,
            paymentMethods: paymentMethods || [],
            items,
            date: new Date(),
        };

        // Agregar el pedido a la caja
        activeCashRegister.orders.push(orderEntry);

        // Recalcular el total del sistema basado en todos los pedidos
        const systemTotal = activeCashRegister.orders.reduce((sum, order) => sum + (order.total || 0), 0);
        activeCashRegister.amountSystem = systemTotal;

        // Guardar los cambios
        await activeCashRegister.save();

        res.status(200).send({ 
            success: true, 
            message: 'Pedido agregado a la caja registradora.', 
            cashRegister: activeCashRegister 
        });
    } catch (error) {
        console.error('Error al agregar pedido a la caja:', error);
        res.status(500).send({ success: false, message: 'Error al agregar pedido a la caja.', error });
    }
};

// Close an order
const closeOrder = async (req, res) => {
    try {
        const { total, paymentMethod, paymentMethods, items } = req.body;

        // Buscar la caja activa
        const activeCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        if (!activeCashRegister) {
            return res.status(400).send({ success: false, message: 'No hay una caja activa.' });
        }

        // Crear el pedido
        const newOrder = {
            total,
            paymentMethod,
            paymentMethods: paymentMethods || [],
            items,
            date: new Date(),
        };

        // Guardar el pedido en la colección de pedidos de la caja activa
        activeCashRegister.orders.push(newOrder);

        // Actualizar el balance de la caja activa
        activeCashRegister.amountSystem += total;

        // Guardar los cambios en la caja activa
        await activeCashRegister.save();

        res.status(201).send({ success: true, message: 'Pedido cerrado y registrado en la caja activa.', newOrder });
    } catch (error) {
        console.error('Error al cerrar el pedido:', error);
        res.status(500).send({ success: false, message: 'Error al cerrar el pedido.', error });
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
    addOrderToCashRegister,
    closeOrder,
};