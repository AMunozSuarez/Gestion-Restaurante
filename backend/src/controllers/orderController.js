const orderModel = require('../models/orderModel');
const foodModel = require('../models/foodModel'); // Importar el modelo de alimentos

// CREATE A NEW ORDER

const createOrderController = async (req, res) => {
    try {
        const { foods, payment, buyer, customerPhone, status } = req.body;

        // Validar que los alimentos existan en la base de datos
        const foodIds = foods.map((item) => item.food); // Extraer los IDs de los alimentos
        const existingFoods = await foodModel.find({ _id: { $in: foodIds } });

        if (existingFoods.length !== foods.length) {
            return res.status(400).send({
                success: false,
                message: 'One or more food items do not exist in the database'
            });
        }

        // Calcular el total sumando los precios de los alimentos multiplicados por su cantidad
        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0);

        // Crear la orden
        const order = new orderModel({
            foods,
            payment,
            total,
            buyer,
            customerPhone,
            status: status || 'preparing' // Usar el estado predeterminado si no se proporciona
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
        const orders = await orderModel.find();
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

// UPDATE AN ORDER
const updateOrderController = async (req, res) => {
    try {
        const { foods, additionalCosts = 0, discount = 0 } = req.body;

        // Validar si se proporcionaron alimentos
        if (foods && (!Array.isArray(foods) || foods.length === 0)) {
            return res.status(400).send({
                success: false,
                message: 'Please provide a valid list of food items'
            });
        }

        let total = 0;

        // Si se proporcionaron alimentos, validar que existan y recalcular el total
        if (foods) {
            const existingFoods = await foodModel.find({ _id: { $in: foods } });
            if (existingFoods.length !== foods.length) {
                return res.status(400).send({
                    success: false,
                    message: 'One or more food items do not exist in the database'
                });
            }

            // Calcular el total sumando los precios de los alimentos
            const foodPrices = existingFoods.map((food) => food.price);
            total = foodPrices.reduce((sum, price) => sum + price, 0);
        }

        // Aplicar costos adicionales y descuentos
        total = total + additionalCosts - discount;

        // Actualizar la orden en la base de datos
        const updatedOrder = await orderModel.findByIdAndUpdate(
            req.params.id,
            { ...req.body, total }, // Actualizar el total calculado
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).send({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).send({
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating order',
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
    deleteOrderController
};