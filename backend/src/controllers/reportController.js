const mongoose = require('mongoose');
const orderModel = require('../models/orderModel');
const customerModel = require('../models/customerModel');
const foodModel = require('../models/foodModel');
const { getChileDayRange } = require('../utils/dateUtils');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Construye un filtro de fecha para Chile en forma DST-safe.
 * Recibe strings YYYY-MM-DD y devuelve rango UTC que cubre el día completo en Chile.
 */
const buildDateFilter = (startDate, endDate) => {
    const filter = {};

    if (startDate) {
        const fromRange = getChileDayRange(startDate);
        if (!fromRange) return null;
        filter.$gte = fromRange.start;
    }

    if (endDate) {
        const toRange = getChileDayRange(endDate);
        if (!toRange) return null;
        filter.$lte = toRange.end;
    }

    return Object.keys(filter).length ? filter : null;
};

const getChileDateKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const getPart = (type) => Number(parts.find((part) => part.type === type)?.value);
    const year = getPart('year');
    const month = String(getPart('month')).padStart(2, '0');
    const day = String(getPart('day')).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// ─── 1. Reporte General de Ventas ─────────────────────────────────────────────

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        const matchStage = {
            restaurant: restaurantId,
            status: { $in: ['Completado', 'Enviado'] }
        };

        const dateFilter = buildDateFilter(startDate, endDate);
        if (dateFilter) matchStage.createdAt = dateFilter;

        const sales = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    avgTicket: { $avg: '$total' },
                    totalTips: { $sum: '$tip' },
                    totalDeliveryCost: { $sum: '$deliveryCost' },
                }
            },
        ]);

        // Ventas por sección
        const salesBySection = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$section',
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Ventas por método de pago
        const salesByPayment = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$payment',
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Ventas por día (para gráfico de tendencia)
        const salesByDay = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Santiago' }
                    },
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Ventas por hora del día
        const salesByHour = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        $hour: { date: '$createdAt', timezone: 'America/Santiago' }
                    },
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            summary: sales[0] || { totalSales: 0, totalOrders: 0, avgTicket: 0, totalTips: 0, totalDeliveryCost: 0 },
            salesBySection,
            salesByPayment,
            salesByDay,
            salesByHour,
        });
    } catch (error) {
        console.error('Error en getSalesReport:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de ventas', error: error.message });
    }
};

// ─── 2. Productos más / menos vendidos ────────────────────────────────────────

const getProductsReport = async (req, res) => {
    try {
        const { startDate, endDate, limit = 20 } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        const matchStage = {
            restaurant: restaurantId,
            status: { $in: ['Completado', 'Enviado'] }
        };

        const dateFilter = buildDateFilter(startDate, endDate);
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Productos más vendidos (por cantidad)
        const topProducts = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            {
                $group: {
                    _id: '$foods.food',
                    totalQuantity: { $sum: '$foods.quantity' },
                    orderCount: { $sum: 1 },
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'foods',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalQuantity: 1,
                    orderCount: 1,
                    totalRevenue: { $multiply: ['$totalQuantity', { $ifNull: ['$product.price', 0] }] },
                    product: {
                        title: '$product.title',
                        price: '$product.price',
                        code: '$product.code',
                        category: '$category.title',
                    }
                }
            }
        ]);

        // Productos menos vendidos
        const leastProducts = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            {
                $group: {
                    _id: '$foods.food',
                    totalQuantity: { $sum: '$foods.quantity' },
                    orderCount: { $sum: 1 },
                }
            },
            { $sort: { totalQuantity: 1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'foods',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalQuantity: 1,
                    orderCount: 1,
                    totalRevenue: { $multiply: ['$totalQuantity', { $ifNull: ['$product.price', 0] }] },
                    product: {
                        title: '$product.title',
                        price: '$product.price',
                        code: '$product.code',
                        category: '$category.title',
                    }
                }
            }
        ]);

        // Ventas por categoría
        const salesByCategory = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'foods.food',
                    foreignField: '_id',
                    as: 'foodDetail'
                }
            },
            { $unwind: '$foodDetail' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'foodDetail.category',
                    foreignField: '_id',
                    as: 'categoryDetail'
                }
            },
            { $unwind: { path: '$categoryDetail', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$categoryDetail._id',
                    categoryName: { $first: '$categoryDetail.title' },
                    totalQuantity: { $sum: '$foods.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$foods.quantity', '$foodDetail.price'] } },
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Productos nunca vendidos en el período
        const soldProductIds = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            { $group: { _id: '$foods.food' } }
        ]);
        const soldIds = soldProductIds.map(p => p._id);

        const neverSold = await foodModel.find({
            restaurant: restaurantId,
            _id: { $nin: soldIds },
            isAvailable: true
        }).populate('category', 'title').select('title price code category').lean();

        res.status(200).json({
            success: true,
            topProducts,
            leastProducts,
            salesByCategory,
            neverSold
        });
    } catch (error) {
        console.error('Error en getProductsReport:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de productos', error: error.message });
    }
};

// ─── 3. Reporte de Clientes ──────────────────────────────────────────────────

const getCustomersReport = async (req, res) => {
    try {
        const { startDate, endDate, limit = 20 } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        const matchStage = {
            restaurant: restaurantId,
            status: { $in: ['Completado', 'Enviado'] }
        };

        const dateFilter = buildDateFilter(startDate, endDate);
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Top clientes por gasto
        const topCustomersBySpend = await orderModel.aggregate([
            { $match: { ...matchStage, buyer: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$buyer',
                    totalSpent: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    avgTicket: { $avg: '$total' },
                    lastOrder: { $max: '$createdAt' },
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalSpent: 1,
                    orderCount: 1,
                    avgTicket: 1,
                    lastOrder: 1,
                    customer: {
                        name: '$customer.name',
                        phone: '$customer.phone',
                    }
                }
            }
        ]);

        // Top clientes por frecuencia
        const topCustomersByFrequency = await orderModel.aggregate([
            { $match: { ...matchStage, buyer: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$buyer',
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: '$total' },
                    lastOrder: { $max: '$createdAt' },
                }
            },
            { $sort: { orderCount: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalSpent: 1,
                    orderCount: 1,
                    lastOrder: 1,
                    customer: {
                        name: '$customer.name',
                        phone: '$customer.phone',
                    }
                }
            }
        ]);

        // Nuevos clientes por día
        const newCustomersByDay = await customerModel.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    ...(dateFilter ? { createdAt: dateFilter } : {})
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Santiago' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total de clientes
        const totalCustomers = await customerModel.countDocuments({ restaurant: restaurantId });

        // Estadísticas generales de clientes
        const customerStats = await orderModel.aggregate([
            { $match: { ...matchStage, buyer: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$buyer',
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: '$total' },
                }
            },
            {
                $group: {
                    _id: null,
                    uniqueCustomers: { $sum: 1 },
                    avgOrdersPerCustomer: { $avg: '$orderCount' },
                    avgSpendPerCustomer: { $avg: '$totalSpent' },
                }
            }
        ]);

        // Pedidos sin cliente registrado vs con cliente
        const orderDistribution = await orderModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        $cond: [{ $ifNull: ['$buyer', false] }, 'con_cliente', 'sin_cliente']
                    },
                    count: { $sum: 1 },
                    total: { $sum: '$total' },
                }
            }
        ]);

        res.status(200).json({
            success: true,
            topCustomersBySpend,
            topCustomersByFrequency,
            newCustomersByDay,
            totalCustomers,
            customerStats: customerStats[0] || { uniqueCustomers: 0, avgOrdersPerCustomer: 0, avgSpendPerCustomer: 0 },
            orderDistribution,
        });
    } catch (error) {
        console.error('Error en getCustomersReport:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de clientes', error: error.message });
    }
};

// ─── 4. Resumen Rápido (Dashboard) ───────────────────────────────────────────

const getDashboardReport = async (req, res) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        const now = new Date();
        const todayStr = getChileDateKey(now);
        const todayRange = getChileDayRange(todayStr);

        if (!todayRange) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo calcular el rango de fecha de hoy en Chile',
            });
        }

        const todayStart = todayRange.start;
        const todayEnd = todayRange.end;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getChileDateKey(yesterday);
        const yesterdayRange = getChileDayRange(yesterdayStr);

        if (!yesterdayRange) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo calcular el rango de fecha de ayer en Chile',
            });
        }

        const yesterdayStart = yesterdayRange.start;
        const yesterdayEnd = yesterdayRange.end;

        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);

        const baseMatch = {
            restaurant: restaurantId,
            status: { $in: ['Completado', 'Enviado'] }
        };

        const todaySales = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 }, tips: { $sum: '$tip' } } }
        ]);

        const yesterdaySales = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);

        const weekSales = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: weekAgo } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);

        const monthSales = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: monthAgo } } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);

        const todayTopProducts = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $unwind: '$foods' },
            { $group: { _id: '$foods.food', qty: { $sum: '$foods.quantity' } } },
            { $sort: { qty: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'foods', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, qty: 1, name: '$product.title', price: '$product.price' } }
        ]);

        const todayCancelled = await orderModel.countDocuments({
            restaurant: restaurantId,
            status: 'Cancelado',
            createdAt: { $gte: todayStart, $lte: todayEnd }
        });

        const weekTrend = await orderModel.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: weekAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Santiago' } },
                    total: { $sum: '$total' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const todayData = todaySales[0] || { total: 0, count: 0, tips: 0 };
        const yesterdayData = yesterdaySales[0] || { total: 0, count: 0 };

        const salesChange = yesterdayData.total > 0
            ? (((todayData.total - yesterdayData.total) / yesterdayData.total) * 100).toFixed(1)
            : null;

        res.status(200).json({
            success: true,
            today: {
                sales: todayData.total,
                orders: todayData.count,
                tips: todayData.tips,
                cancelled: todayCancelled,
                avgTicket: todayData.count > 0 ? Math.round(todayData.total / todayData.count) : 0,
                salesChange,
            },
            week: weekSales[0] || { total: 0, count: 0 },
            month: monthSales[0] || { total: 0, count: 0 },
            todayTopProducts,
            weekTrend,
        });
    } catch (error) {
        console.error('Error en getDashboardReport:', error);
        res.status(500).json({ success: false, message: 'Error al generar dashboard', error: error.message });
    }
};


// ─── 5. Detalle de ventas por producto específico ─────────────────────────────

const getProductDetailReport = async (req, res) => {
    try {
        const { foodId, startDate, endDate } = req.query;
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        if (!foodId) {
            return res.status(400).json({ success: false, message: 'Se requiere el parámetro foodId' });
        }

        const foodObjectId = new mongoose.Types.ObjectId(foodId);

        const matchStage = {
            restaurant: restaurantId,
            status: { $in: ['Completado', 'Enviado'] },
            'foods.food': foodObjectId,
        };

        const dateFilter = buildDateFilter(startDate, endDate);
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Resumen global del producto
        const summary = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            { $match: { 'foods.food': foodObjectId } },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'foods.food',
                    foreignField: '_id',
                    as: 'foodDetail'
                }
            },
            { $unwind: '$foodDetail' },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$foods.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$foods.quantity', '$foodDetail.price'] } },
                    orderCount: { $sum: 1 },
                }
            },
        ]);

        // Ventas por día (para gráfico de tendencia)
        const salesByDay = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            { $match: { 'foods.food': foodObjectId } },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'foods.food',
                    foreignField: '_id',
                    as: 'foodDetail'
                }
            },
            { $unwind: '$foodDetail' },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Santiago' }
                    },
                    quantity: { $sum: '$foods.quantity' },
                    revenue: { $sum: { $multiply: ['$foods.quantity', '$foodDetail.price'] } },
                    orders: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Ventas por sección (mostrador / delivery / mesa)
        const salesBySection = await orderModel.aggregate([
            { $match: matchStage },
            { $unwind: '$foods' },
            { $match: { 'foods.food': foodObjectId } },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'foods.food',
                    foreignField: '_id',
                    as: 'foodDetail'
                }
            },
            { $unwind: '$foodDetail' },
            {
                $group: {
                    _id: '$section',
                    quantity: { $sum: '$foods.quantity' },
                    revenue: { $sum: { $multiply: ['$foods.quantity', '$foodDetail.price'] } },
                }
            },
            { $sort: { quantity: -1 } }
        ]);

        // Info del producto
        const productInfo = await foodModel
            .findById(foodObjectId)
            .populate('category', 'title')
            .select('title price code category')
            .lean();

        const s = summary[0] || { totalQuantity: 0, totalRevenue: 0, orderCount: 0 };
        const avgPerOrder = s.orderCount > 0 ? (s.totalQuantity / s.orderCount).toFixed(2) : 0;

        res.status(200).json({
            success: true,
            product: productInfo,
            summary: { ...s, avgPerOrder: parseFloat(avgPerOrder) },
            salesByDay,
            salesBySection,
        });
    } catch (error) {
        console.error('Error en getProductDetailReport:', error);
        res.status(500).json({ success: false, message: 'Error al generar reporte de producto', error: error.message });
    }
};


module.exports = {
    getSalesReport,
    getProductsReport,
    getCustomersReport,
    getDashboardReport,
    getProductDetailReport,
};