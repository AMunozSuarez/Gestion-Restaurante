const orderModel = require('../models/orderModel');


// 
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const sales = await orderModel.aggregate([
            { $match: { restaurant: req.user.restaurant, createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
            { $group: { _id: null, totalSales: { $sum: '$total' }, totalOrders: { $sum: 1 } } },
        ]);
        res.status(200).send({ success: true, sales });
    } catch (error) {
        res.status(500).send({ success: false, message: 'Error al generar reporte', error });
    }
};


module.exports = {
    getSalesReport,
};