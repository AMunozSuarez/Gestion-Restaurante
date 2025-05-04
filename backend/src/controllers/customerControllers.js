const Customer = require('../models/customerModel');

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
        const customers = await Customer.find({
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

module.exports = { searchCustomersController };