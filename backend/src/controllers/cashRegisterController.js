const cashRegisterModel = require('../models/cashRegisterModel');


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


module.exports = {
    addCashMovement,
    getCashMovements,
};