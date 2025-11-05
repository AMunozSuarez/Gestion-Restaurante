const orderModel = require('../models/orderModel');
const foodModel = require('../models/foodModel'); // Importar el modelo de alimentos
const Customer = require('../models/customerModel'); // Importar el modelo de clientes
const cashRegisterModel = require('../models/cashRegisterModel'); // Importar el modelo de caja

// CREATE A NEW ORDER

const createOrderController = async (req, res) => {
    try {
        const { foods, payment, buyer, section, status, selectedAddress, comment } = req.body;
        
                let customer = null;
        let deliveryCost = 0;

        // Verificar si se proporciona el campo buyer
        if (buyer) {
            // Caso 1: Si buyer es un ID (cliente existente)
            if (typeof buyer === 'string') {
                customer = await Customer.findOne({ 
                    _id: buyer,
                    restaurant: req.user.restaurant
                });
                
                if (!customer) {
                    return res.status(404).json({
                        success: false,
                        message: 'Cliente no encontrado o no pertenece a este restaurante',
                    });
                }
            } 
            // Caso 2: Si buyer es un objeto (cliente nuevo o no guardado)
            else if (typeof buyer === 'object' && buyer.phone) {
                // Buscar si ya existe un cliente con este teléfono
                customer = await Customer.findOne({ 
                    phone: buyer.phone,
                    restaurant: req.user.restaurant
                });

                // Si no existe, crear nuevo cliente
                if (!customer) {
                    customer = new Customer({
                        name: buyer.name || 'Cliente',
                        phone: buyer.phone,
                        addresses: buyer.addresses || [],
                        comment: buyer.comment || '',
                        restaurant: req.user.restaurant // Asignar el restaurante del usuario autenticado
                    });
                    await customer.save();
                }
            }

            // Si hay dirección seleccionada, calcular costo de envío
            if (selectedAddress && customer) {
                const addressWithCost = customer.addresses.find(
                    addr => addr.address === selectedAddress
                );
                if (addressWithCost && typeof addressWithCost.deliveryCost === 'number') {
                    deliveryCost = addressWithCost.deliveryCost;
                }
            }
        }

        const foodIds = foods.map((item) => item.food);
        const existingFoods = await foodModel.find({ _id: { $in: foodIds }, restaurant: req.user.restaurant });

        if (existingFoods.length !== foods.length) {
            return res.status(400).json({
                success: false,
                message: 'Uno o más alimentos no pertenecen a este restaurante',
            });
        }

        const total = foods.reduce((sum, item) => {
            const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
            return sum + (foodDetails.price * item.quantity);
        }, 0) + deliveryCost;

        // Obtener la caja abierta actual
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        if (!currentCashRegister) {
            return res.status(400).json({
                success: false,
                message: 'No hay una caja abierta. Por favor, abre una caja antes de crear órdenes.',
            });
        }

        // Obtener el último número de orden de la caja actual
        const lastOrder = await orderModel.findOne({ 
            cashRegister: currentCashRegister._id 
        }).sort({ orderNumber: -1 });
        
        const orderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1;

        const order = new orderModel({
            orderNumber,
            foods,
            payment: payment || null, // Hacer payment opcional
            total,
            deliveryCost,
            name: !customer ? (buyer?.name || null) : null,
            buyer: customer ? customer._id : null,
            selectedAddress: customer ? selectedAddress : null,
            section,
            status: status || 'Preparacion',
            comment: comment || '',
            cashRegister: currentCashRegister._id, // Asignar la caja actual
            restaurant: req.user.restaurant, // Siempre asignar el restaurante
        });

        await order.save();

        // Poblar los detalles de los alimentos para la respuesta
        const populatedOrder = await orderModel.findById(order._id)
            .populate('foods.food', 'title price')
            .populate('buyer', 'name phone')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            order: populatedOrder,
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
        // Obtener la caja abierta actual
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        // Si no hay caja abierta, devolver lista vacía en lugar de error
        if (!currentCashRegister) {
            return res.status(200).json({
                success: true,
                message: 'No hay una caja abierta',
                orders: [],
            });
        }

        const orders = await orderModel
            .find({ 
                restaurant: req.user.restaurant,
                cashRegister: currentCashRegister._id 
            })
            .populate('foods.food') // Incluir los datos de los alimentos
            .populate('buyer'); // Incluir los datos del cliente

        if (!orders) {
            return res.status(404).send({
                success: false,
                message: 'No se encontraron pedidos para este restaurante',
            });
        }

        res.status(200).send({
            success: true,
            message: 'Pedidos recuperados exitosamente',
            orders,
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
            .populate('foods.food') // Incluir los datos de los alimentos
            .populate('buyer'); // Incluir los datos del cliente

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado o no pertenece a este restaurante',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pedido recuperado exitosamente',
            order,
        });
    } catch (error) {
        console.error('Error recuperando el pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Error recuperando el pedido',
            error: error.message,
        });
    }
};

// GET AN ORDER BY NUMBER
const getOrderByNumberController = async (req, res) => {
    try {
        const { orderNumber } = req.params;
        
        // Obtener la caja abierta actual
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        if (!currentCashRegister) {
            return res.status(400).json({
                success: false,
                message: 'No se puede buscar órdenes sin una caja abierta. Por favor, abra una caja primero.',
            });
        }

        const order = await orderModel
            .findOne({ 
                orderNumber,
                cashRegister: currentCashRegister._id 
            })
            .populate('foods.food') // Incluir los datos de los alimentos
            .populate('buyer'); // Incluir los datos del cliente

        if (!order) {
            return res.status(404).send({
                success: false,
                message: 'Pedido no encontrado',
            });
        }

        res.status(200).send({
            success: true,
            message: 'Pedido recuperado exitosamente',
            order,
        });
    } catch (error) {
        console.error('Error recuperando el pedido por número:', error);
        res.status(500).json({
            success: false,
            message: 'Error recuperando el pedido',
            error: error.message,
        });
    }
};

// UPDATE AN ORDER
const updateOrderController = async (req, res) => {
    try {
        const { buyer, foods, payment, section, status, selectedAddress, comment } = req.body;
        console.log('Datos recibidos en el backend:', req.body);
        
        // Buscar la orden existente
        const existingOrder = await orderModel.findOne({ 
            _id: req.params.id, 
            restaurant: req.user.restaurant 
        });

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado o no pertenece a este restaurante',
            });
        }

        // Preparar objeto de actualización
        const updateData = {};

        // Si solo se está actualizando el método de pago (o status u otro campo simple)
        if (payment !== undefined) {
            updateData.payment = payment;
        }
        
        if (status !== undefined) {
            updateData.status = status;
        }
        
        if (comment !== undefined) {
            updateData.comment = comment;
        }

        // Si se envían foods, validar y actualizar con cálculo completo
        if (foods && Array.isArray(foods)) {
            if (!Array.isArray(foods)) {
                return res.status(400).json({
                    success: false,
                    message: 'La propiedad foods debe ser un array.',
                });
            }
            
            const invalidFood = foods.find((item) => !item.food || !item.quantity || item.comment === undefined);
            if (invalidFood) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los elementos de foods deben tener las propiedades food, quantity y comment.',
                });
            }

            let customer = null;
            let deliveryCost = 0;

            if (buyer && buyer.phone) {
                customer = await Customer.findOne({ phone: buyer.phone });

                if (!customer) {
                    customer = new Customer({
                        name: buyer.name,
                        phone: buyer.phone,
                        addresses: buyer.addresses || [],
                        comment: buyer.comment || '',
                    });
                    await customer.save();
                } else {
                    customer.name = buyer.name;
                    customer.comment = buyer.comment || customer.comment;

                    customer.addresses.forEach((addr) => {
                        if (addr.address === selectedAddress) {
                            addr.deliveryCost = buyer.addresses.find((newAddr) => newAddr.address === selectedAddress).deliveryCost;
                        }
                    });

                    buyer.addresses.forEach((newAddress) => {
                        const existingAddress = customer.addresses.find(
                            (addr) => addr.address === newAddress.address
                        );
                        if (!existingAddress) {
                            customer.addresses.push(newAddress);
                        }
                    });

                    await customer.save();
                }

                const selectedAddressObj = customer.addresses.find((addr) => addr.address === selectedAddress);
                if (!selectedAddressObj) {
                    return res.status(400).json({
                        success: false,
                        message: 'La dirección seleccionada no está asociada al cliente',
                    });
                }
                deliveryCost = selectedAddressObj.deliveryCost;
            }

            const foodIds = foods.map((item) => item.food);
            const existingFoods = await foodModel.find({ _id: { $in: foodIds }, restaurant: req.user.restaurant });

            if (existingFoods.length !== foods.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Uno o más alimentos no pertenecen a este restaurante',
                });
            }

            const total = foods.reduce((sum, item) => {
                const foodDetails = existingFoods.find((food) => food._id.toString() === item.food);
                return sum + (foodDetails.price * item.quantity);
            }, 0) + deliveryCost;

            // Actualizar datos relacionados con foods
            updateData.name = !customer ? buyer.name : null;
            updateData.buyer = customer ? customer._id : null;
            updateData.foods = foods;
            if (section !== undefined) updateData.section = section;
            updateData.total = total;
            updateData.deliveryCost = deliveryCost;
            updateData.selectedAddress = customer ? selectedAddress : null;
        }

        // Actualizar la orden
        const updatedOrder = await orderModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Poblar los detalles de los alimentos para la respuesta
        const populatedOrder = await orderModel.findById(updatedOrder._id)
            .populate('foods.food', 'title price')
            .populate('buyer', 'name phone')
            .lean();

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
            // Usar la zona horaria de Chile (UTC-3 o UTC-4)
            // Convertir la fecha recibida a inicio y fin del día en hora local de Chile
            const startOfDay = new Date(date + 'T00:00:00-03:00'); // Inicio del día en Chile
            const endOfDay = new Date(date + 'T23:59:59.999-03:00'); // Fin del día en Chile
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

        const orders = await orderModel.find(filters)
            .sort({ createdAt: -1 })
            .populate('foods.food', 'title price') // Incluir los datos de los alimentos
            .populate('buyer', 'name phone'); // Incluir los datos del cliente
        
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

        // allow sorting by createdAt or updatedAt
        let { sortBy } = req.query;
        const allowedSorts = ['createdAt', 'updatedAt'];
        if (!allowedSorts.includes(sortBy)) sortBy = 'createdAt';

        // Obtener la caja abierta actual
        const currentCashRegister = await cashRegisterModel.findOne({
            restaurant: req.user.restaurant,
            status: 'Abierta',
        });

        // Si no hay caja abierta, devolver lista vacía en lugar de error
        if (!currentCashRegister) {
            return res.status(200).json({
                success: true,
                message: 'No hay una caja abierta',
                orders: [],
            });
        }

        const filters = {
            restaurant: req.user.restaurant,
            cashRegister: currentCashRegister._id,
        };

        if (status) {
            // support comma separated statuses
            const statuses = status.split(',').map(s => s.trim());
            filters.status = { $in: statuses };
        }

        if (section) {
            filters.section = section;
        }

        const numericLimit = Number(limit) || 10;

        const orders = await orderModel.find(filters)
            .sort({ [sortBy]: -1 })
            .limit(numericLimit)
            .populate('foods.food')
            .populate('buyer');

        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error en getRecentOrders:', error);
        res.status(500).json({ success: false, message: 'Error al obtener órdenes recientes', error });
    }
};

module.exports = {
    createOrderController,
    getAllOrdersController,
    updateOrderController,
    deleteOrderController,
    getOrderByIdController,
    getOrderByNumberController,
    getFilteredOrders,
    getRecentOrders
};