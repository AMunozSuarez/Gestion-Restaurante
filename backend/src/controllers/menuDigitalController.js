const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Restaurant = require('../models/restaurantModel');
const Category = require('../models/categoryModel');
const Food = require('../models/foodModel');
const ExtraSection = require('../models/extraSectionModel');
const MenuVisit = require('../models/menuVisitModel');

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const slugify = (text) =>
    (text || '')
        .toString()
        .normalize('NFD')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const generateSlug = () => crypto.randomBytes(4).toString('hex');

const getSettings = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        const normalizedSettings = Restaurant.normalizeSettings(restaurant.settings || {});

        res.status(200).json({
            success: true,
            data: {
                publicMenuSlug: restaurant.publicMenuSlug,
                name: restaurant.name,
                phone: restaurant.phone,
                address: restaurant.address,
                email: restaurant.email,
                digitalMenu: normalizedSettings.digitalMenu,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener la configuración del menú digital', error });
    }
};

const updateSettings = async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'No tienes permiso para modificar el menú digital.' });
        }

        const restaurant = await Restaurant.findById(req.user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        const currentSettings = Restaurant.normalizeSettings(restaurant.settings || {});
        const mergedDigitalMenu = { ...currentSettings.digitalMenu, ...(req.body.digitalMenu || {}) };
        const normalizedSettings = Restaurant.normalizeSettings({ ...currentSettings, digitalMenu: mergedDigitalMenu });

        restaurant.settings = normalizedSettings;

        if (normalizedSettings.digitalMenu.enabled && !restaurant.publicMenuSlug) {
            const base = slugify(restaurant.name) || 'restaurante';
            let slug = null;
            for (let attempt = 0; attempt < 6; attempt += 1) {
                const candidate = attempt === 0 ? base : `${base}-${attempt === 5 ? generateSlug() : attempt + 1}`;
                const existing = await Restaurant.findOne({ publicMenuSlug: candidate });
                if (!existing) {
                    slug = candidate;
                    break;
                }
            }
            if (slug) {
                restaurant.publicMenuSlug = slug;
            }
        }

        await restaurant.save();

        res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar la configuración del menú digital', error });
    }
};

const removeOldFileIfInFolder = async (fileUrl, folder) => {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.includes(folder)) return;
    try {
        const filename = path.basename(fileUrl);
        const filePath = path.join(__dirname, '../../uploads/menu-digital', folder, filename);
        await fs.promises.unlink(filePath);
    } catch (error) {
        // Silenciosamente ignorar si no existe
    }
};

const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
        }

        const restaurant = await Restaurant.findById(req.user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        const normalizedSettings = Restaurant.normalizeSettings(restaurant.settings || {});
        await removeOldFileIfInFolder(normalizedSettings.digitalMenu.logoUrl, String(req.user.restaurant));

        const logoUrl = `/uploads/menu-digital/${req.user.restaurant}/${req.file.filename}`;
        normalizedSettings.digitalMenu.logoUrl = logoUrl;
        restaurant.settings = normalizedSettings;
        await restaurant.save();

        res.status(200).json({ success: true, data: { logoUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al subir el logo', error });
    }
};

const uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
        }

        const restaurant = await Restaurant.findById(req.user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        const normalizedSettings = Restaurant.normalizeSettings(restaurant.settings || {});
        await removeOldFileIfInFolder(normalizedSettings.digitalMenu.bannerUrl, String(req.user.restaurant));

        const bannerUrl = `/uploads/menu-digital/${req.user.restaurant}/${req.file.filename}`;
        normalizedSettings.digitalMenu.bannerUrl = bannerUrl;
        restaurant.settings = normalizedSettings;
        await restaurant.save();

        res.status(200).json({ success: true, data: { bannerUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al subir el banner', error });
    }
};

const getQr = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        if (!restaurant.publicMenuSlug) {
            return res.status(400).json({ success: false, message: 'Debes activar el menú digital primero' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const publicUrl = `${frontendUrl}/menu/${restaurant.publicMenuSlug}`;

        if (req.query.format === 'svg') {
            const svgString = await QRCode.toString(publicUrl, { type: 'svg' });
            return res.type('image/svg+xml').send(svgString);
        }

        const dataUrl = await QRCode.toDataURL(publicUrl);
        res.status(200).json({ success: true, data: { dataUrl, publicUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar el código QR', error });
    }
};

const getStats = async (req, res) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurant);

        const [totalVisits, topProductsAgg, topCategoriesAgg, lastVisit] = await Promise.all([
            MenuVisit.countDocuments({ restaurant: restaurantId, type: 'menu_visit' }),
            MenuVisit.aggregate([
                { $match: { restaurant: restaurantId, type: 'product_view' } },
                { $group: { _id: '$food', views: { $sum: 1 } } },
                { $sort: { views: -1 } },
                { $limit: 5 },
            ]),
            MenuVisit.aggregate([
                { $match: { restaurant: restaurantId, type: 'category_view' } },
                { $group: { _id: '$category', views: { $sum: 1 } } },
                { $sort: { views: -1 } },
                { $limit: 5 },
            ]),
            MenuVisit.findOne({ restaurant: restaurantId }).sort({ createdAt: -1 }),
        ]);

        const topProducts = await Promise.all(
            topProductsAgg.map(async (item) => {
                const food = item._id ? await Food.findById(item._id).select('title') : null;
                return { foodId: item._id, title: food ? food.title : null, views: item.views };
            })
        );

        const topCategories = await Promise.all(
            topCategoriesAgg.map(async (item) => {
                const category = item._id ? await Category.findById(item._id).select('title') : null;
                return { categoryId: item._id, title: category ? category.title : null, views: item.views };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                totalVisits,
                topProducts,
                topCategories,
                lastVisitAt: lastVisit ? lastVisit.createdAt : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener las estadísticas del menú digital', error });
    }
};

const isRestaurantOpenNow = (schedule) => {
    const now = new Date();
    const dayName = DAY_NAMES[now.getDay()];
    const todaySchedule = (schedule || []).find((entry) => entry.day === dayName);

    if (!todaySchedule || todaySchedule.closed) {
        return false;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMinute] = (todaySchedule.open || '00:00').split(':').map(Number);
    const [closeHour, closeMinute] = (todaySchedule.close || '00:00').split(':').map(Number);
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

const buildFoodExtraSections = async (food) => {
    const result = [];

    for (const entry of food.extraSections || []) {
        const section = await ExtraSection.findById(entry.section);
        if (!section) continue;

        let extras = (section.extras || []).filter((extra) => extra.isAvailable);

        if (Array.isArray(entry.visibleExtraIds) && entry.visibleExtraIds.length > 0) {
            const visibleIds = entry.visibleExtraIds.map((id) => String(id));
            extras = extras.filter((extra) => visibleIds.includes(String(extra._id)));
        }

        result.push({
            sectionName: section.sectionName,
            maxSelection: entry.maxSelection,
            extras: extras.map((extra) => ({ _id: extra._id, name: extra.name, price: extra.price })),
        });
    }

    return result;
};

const getPublicMenu = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ publicMenuSlug: req.params.slug });
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Menú no encontrado' });
        }

        const normalizedSettings = Restaurant.normalizeSettings(restaurant.settings || {});
        const digitalMenu = normalizedSettings.digitalMenu;

        if (!digitalMenu.enabled) {
            return res.status(200).json({
                success: true,
                data: {
                    open: false,
                    restaurantName: restaurant.name,
                    closedMessage: 'Actualmente nos encontramos cerrados.',
                    schedule: digitalMenu.schedule,
                },
            });
        }

        if (!isRestaurantOpenNow(digitalMenu.schedule)) {
            return res.status(200).json({
                success: true,
                data: {
                    open: false,
                    restaurantName: restaurant.name,
                    closedMessage: 'Actualmente nos encontramos cerrados.',
                    schedule: digitalMenu.schedule,
                },
            });
        }

        const categories = await Category.find({ restaurant: restaurant._id, isAvailable: true }).sort({ order: 1 });
        const foods = await Food.find({ restaurant: restaurant._id, isAvailable: true, showInDigitalMenu: { $ne: false } });

        const products = await Promise.all(
            foods.map(async (food) => ({
                _id: food._id,
                title: food.title,
                description: food.description,
                price: food.price,
                imageUrl: food.imageUrl,
                category: food.category,
                extraSections: await buildFoodExtraSections(food),
            }))
        );

        res.status(200).json({
            success: true,
            data: {
                open: true,
                restaurant: {
                    name: restaurant.name,
                    description: digitalMenu.description,
                    logoUrl: digitalMenu.logoUrl,
                    bannerUrl: digitalMenu.bannerUrl,
                    showLogo: digitalMenu.showLogo,
                    appearance: digitalMenu.appearance,
                    seo: digitalMenu.seo,
                    phone: restaurant.phone,
                    whatsapp: digitalMenu.whatsapp,
                    address: restaurant.address,
                    socialLinks: digitalMenu.socialLinks,
                },
                categories: categories.map((category) => ({ _id: category._id, title: category.title })),
                products,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener el menú público', error });
    }
};

const trackVisit = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ publicMenuSlug: req.params.slug }).select('_id');
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Menú no encontrado' });
        }

        const { type, categoryId, foodId } = req.body;
        if (!['menu_visit', 'category_view', 'product_view'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Tipo de visita inválido' });
        }

        await MenuVisit.create({
            restaurant: restaurant._id,
            type,
            category: categoryId || undefined,
            food: foodId || undefined,
        });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al registrar la visita', error });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    uploadLogo,
    uploadBanner,
    getQr,
    getStats,
    getPublicMenu,
    trackVisit,
};
