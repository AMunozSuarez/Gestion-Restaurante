const orderModel = require('../models/orderModel');
const foodModel = require('../models/foodModel'); // Importar el modelo de alimentos

// CREATE A NEW ORDER

const createOrderController = async (req, res) => {
    try {
        const { foods, payment, buyer, customerPhone, section, status } = req.body;

        if (!section) {
            return res.status(400).send({
                success: false,
                message: 'Section is required'
            });
        }

        // Validar que los alimentos existan en la base de datos
        const foodIds = foods.map((item) => item.food);
        const existingFoods = await foodModel.find({ _id: { $in: foodIds } });

        if (existingFoods.length !== foods.length) {
            return res.status(400).send({
                success: false,
                message: 'One or more food items do not exist in the database'
            });
        }

        // Calcular el total
        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0);

        // Obtener el último número de orden
        const lastOrder = await orderModel.findOne().sort({ orderNumber: -1 });
        const orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1;

        // Crear la orden
        const order = new orderModel({
            orderNumber,
            foods,
            payment,
            total,
            buyer,
            customerPhone,
            section,
            status: status || 'preparing'
        });

        // Guardar la orden en la base de datos
        await order.save();

        res.status(201).send({
            success: true,
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// GET ALL ORDERS
const getAllOrdersController = async (req, res) => {
    try {
        const orders = await orderModel.find().populate('foods.food');
        if (!orders) {
            return res.status(404).send({ 
                success: false,
                message: 'No order found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Orders retrieved successfully',
            orders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET AN ORDER BY ID
const getOrderByIdController = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id).populate('foods.food');
        if (!order) {
            return res.status(404).send({ 
                success: false,
                message: 'Order not found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Order retrieved successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// GET AN ORDER BY NUMBER
const getOrderByNumberController = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const order = await orderModel.findOne({ orderNumber }).populate('foods.food');

        if (!order) {
            return res.status(404).send({
                success: false,
                message: 'Order not found',
            });
        }

        res.status(200).send({
            success: true,
            message: 'Order retrieved successfully',
            order,
        });
    } catch (error) {
        console.error('Error retrieving order by number:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving order',
            error: error.message,
        });
    }
};

// UPDATE AN ORDER
const updateOrderController = async (req, res) => {
    try {
        const { buyer, customerPhone, foods, payment, section } = req.body;

        // Validar que los campos requeridos estén presentes
        if (!buyer || !foods || !payment || !section) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validar que el campo foods tenga el formato correcto
        if (!Array.isArray(foods) || foods.some((item) => !item.food || !item.quantity)) {
            return res.status(400).json({
                success: false,
                message: 'El campo foods debe ser un arreglo con objetos que incluyan food y quantity'
            });
        }

        // Validar que los alimentos existan en la base de datos
        const foodIds = foods.map((item) => item.food);
        const existingFoods = await foodModel.find({ _id: { $in: foodIds } });

        if (existingFoods.length !== foods.length) {
            return res.status(400).json({
                success: false,
                message: 'Uno o más alimentos no existen en la base de datos'
            });
        }

        // Calcular el total basado en los precios y cantidades
        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0);

        // Actualizar la orden
        const updatedOrder = await orderModel.findByIdAndUpdate(
            req.params.id,
            { buyer, customerPhone, foods, payment, section, total },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pedido actualizado correctamente',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error actualizando el pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando el pedido',
            error: error.message
        });
    }
};

// DELETE AN ORDER
const deleteOrderController = async (req, res) => {
    try {
        const order = await orderModel.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).send({ 
                success: false,
                message: 'Order not found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Order deleted successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrderController,
    getAllOrdersController,
    updateOrderController,
    deleteOrderController,
    getOrderByIdController,
    getOrderByNumberController
};