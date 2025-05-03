const orderModel = require('../models/orderModel');
const foodModel = require('../models/foodModel'); // Importar el modelo de alimentos

// CREATE A NEW ORDER

const createOrderController = async (req, res) => {
    try {
        const { foods, payment, buyer, customerPhone, section, status, deliveryAddress, deliveryCost } = req.body;

        // Validar que los alimentos existan y pertenezcan al restaurante del usuario
        const foodIds = foods.map((item) => item.food);
        const existingFoods = await foodModel.find({ _id: { $in: foodIds }, restaurant: req.user.restaurant });

        if (existingFoods.length !== foods.length) {
            return res.status(400).send({
                success: false,
                message: 'Uno o más alimentos no pertenecen a este restaurante'
            });
        }

        // Calcular el total
        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0) + (deliveryCost || 0); // Sumar el costo de envío al total

        // Obtener el último número de orden para este restaurante
        const lastOrder = await orderModel.findOne({ restaurant: req.user.restaurant }).sort({ orderNumber: -1 });
        const orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1;

        // Crear la orden
        const order = new orderModel({
            orderNumber,
            foods,
            payment,
            total,
            deliveryCost, // Agregar el costo de envío
            buyer,
            customerPhone,
            section,
            deliveryAddress: section === 'delivery' ? deliveryAddress : undefined, // Solo agregar dirección si es delivery
            status: status || 'Preparacion',
            restaurant: req.user.restaurant // Vincular al restaurante del usuario
        });

        await order.save();
        console.log('Pedido guardado:', order);

        res.status(201).send({
            success: true,
            message: 'Pedido creado exitosamente',
            order
        });
    } catch (error) {
        console.error('Error creando el pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando el pedido',
            error: error.message
        });
    }
};

// GET ALL ORDERS
const getAllOrdersController = async (req, res) => {
    try {
        const orders = await orderModel.find({ restaurant: req.user.restaurant }).populate('foods.food');
        if (!orders) {
            return res.status(404).send({
                success: false,
                message: 'No se encontraron pedidos para este restaurante'
            });
        }
        res.status(200).send({
            success: true,
            message: 'Pedidos recuperados exitosamente',
            orders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET AN ORDER BY ID
const getOrderByIdController = async (req, res) => {
    try {
        const order = await orderModel.findOne({ _id: req.params.id, restaurant: req.user.restaurant }).populate('foods.food');
        if (!order) {
            return res.status(404).send({
                success: false,
                message: 'Pedido no encontrado o no pertenece a este restaurante'
            });
        }
        res.status(200).send({
            success: true,
            message: 'Pedido recuperado exitosamente',
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
        const { buyer, customerPhone, foods, payment, section, status, deliveryAddress, deliveryCost } = req.body;

        // Validar que el pedido pertenezca al restaurante del usuario
        const order = await orderModel.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado o no pertenece a este restaurante'
            });
        }

        // Validar que los alimentos existan y pertenezcan al restaurante del usuario
        const foodIds = foods.map((item) => item.food);
        const existingFoods = await foodModel.find({ _id: { $in: foodIds }, restaurant: req.user.restaurant });

        if (existingFoods.length !== foods.length) {
            return res.status(400).json({
                success: false,
                message: 'Uno o más alimentos no pertenecen a este restaurante'
            });
        }

        // Calcular el total basado en los precios y cantidades
        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0) + (deliveryCost || 0); // Sumar el costo de envío al total

        // Actualizar la orden
        const updatedOrder = await orderModel.findByIdAndUpdate(
            req.params.id,
            {
                buyer,
                customerPhone,
                foods,
                payment,
                section,
                total,
                deliveryCost, // Actualizar el costo de envío
                status,
                deliveryAddress: section === 'delivery' ? deliveryAddress : undefined, // Solo actualizar dirección si es delivery
            },
            { new: true, runValidators: true }
        );

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

        const filters = {
            restaurant: req.user.restaurant, // Filtrar por el restaurante del usuario autenticado
        };

        // Filtrar por fecha (usando createdAt)
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0); // Establecer el inicio del día en UTC
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999); // Establecer el final del día en UTC
            filters.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        // Filtrar por estado
        if (status) {
            filters.status = status;
        }

        // Filtrar por método de pago (usando payment)
        if (paymentMethod) {
            filters.payment = paymentMethod;
        }

        const orders = await orderModel.find(filters).sort({ createdAt: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error en getFilteredOrders:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las órdenes', error });
    }
};

module.exports = {
    createOrderController,
    getAllOrdersController,
    updateOrderController,
    deleteOrderController,
    getOrderByIdController,
    getOrderByNumberController,
    getFilteredOrders
};