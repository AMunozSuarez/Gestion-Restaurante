const Customer = require('../models/customerModel');

// Search customers by name or phone for the current restaurant
const searchCustomersController = async (req, res) => {
    try {
        const { query } = req.query; // Obtener el término de búsqueda desde la query string

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'El término de búsqueda es obligatorio',
            });
        }

        // Buscar clientes cuyo nombre o teléfono coincida parcialmente con el término de búsqueda
        // y que pertenezcan al restaurante del usuario autenticado
        const customers = await Customer.find({
            restaurant: req.user.restaurant,
            $or: [
                { name: { $regex: query, $options: 'i' } }, // Búsqueda insensible a mayúsculas/minúsculas
                { phone: { $regex: query, $options: 'i' } },
            ],
        });

        res.status(200).json({
            success: true,
            customers,
        });
    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error buscando clientes',
            error: error.message,
        });
    }
};

// Create a new customer
const createCustomerController = async (req, res) => {
    try {
        const { name, phone, addresses, comment } = req.body;

        // Verificar si ya existe un cliente con ese teléfono en este restaurante
        const existingCustomer = await Customer.findOne({
            phone,
            restaurant: req.user.restaurant
        });

        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un cliente con este número de teléfono',
            });
        }

        // Crear nuevo cliente asociado al restaurante actual
        const newCustomer = new Customer({
            name,
            phone,
            addresses: addresses || [],
            comment: comment || '',
            restaurant: req.user.restaurant
        });

        await newCustomer.save();

        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            customer: newCustomer,
        });
    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando cliente',
            error: error.message,
        });
    }
};

// Update an existing customer
const updateCustomerController = async (req, res) => {
    try {
        const { name, phone, addresses, comment } = req.body;
        const { id } = req.params;

        // Verificar que el cliente exista y pertenezca al restaurante
        const customer = await Customer.findOne({
            _id: id,
            restaurant: req.user.restaurant
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado o no pertenece a este restaurante',
            });
        }

        // Si cambia el teléfono, verificar que no exista otro cliente con ese teléfono
        if (phone !== customer.phone) {
            const duplicatePhone = await Customer.findOne({
                phone,
                restaurant: req.user.restaurant,
                _id: { $ne: id } // Excluir el cliente actual
            });

            if (duplicatePhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe otro cliente con este número de teléfono',
                });
            }
        }

        // Actualizar campos
        customer.name = name || customer.name;
        customer.phone = phone || customer.phone;
        customer.comment = comment !== undefined ? comment : customer.comment;

        // Actualizar direcciones si se proporcionan
        if (addresses && Array.isArray(addresses)) {
            customer.addresses = addresses;
        }

        await customer.save();

        res.status(200).json({
            success: true,
            message: 'Cliente actualizado exitosamente',
            customer,
        });
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando cliente',
            error: error.message,
        });
    }
};

// Get all customers for the current restaurant
const getAllCustomersController = async (req, res) => {
    try {
        const customers = await Customer.find({
            restaurant: req.user.restaurant
        }).sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: customers.length,
            customers,
        });
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo clientes',
            error: error.message,
        });
    }
};

// Get customer by ID
const getCustomerByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await Customer.findOne({
            _id: id,
            restaurant: req.user.restaurant
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado o no pertenece a este restaurante',
            });
        }

        res.status(200).json({
            success: true,
            customer,
        });
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo cliente',
            error: error.message,
        });
    }
};

// Delete a customer
const deleteCustomerController = async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await Customer.findOneAndDelete({
            _id: id,
            restaurant: req.user.restaurant
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado o no pertenece a este restaurante',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cliente eliminado exitosamente',
            customer,
        });
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando cliente',
            error: error.message,
        });
    }
};

module.exports = { 
    searchCustomersController,
    createCustomerController,
    updateCustomerController,
    getAllCustomersController,
    getCustomerByIdController,
    deleteCustomerController
};