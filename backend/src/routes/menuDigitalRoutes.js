const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const {
    getSettings,
    updateSettings,
    uploadLogo,
    uploadBanner,
    getQr,
    getStats,
    getPublicMenu,
    trackVisit,
} = require('../controllers/menuDigitalController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/menu-digital', String(req.user.restaurant));
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const prefix = req.originalUrl.includes('banner') ? 'banner' : 'logo';
        const ext = path.extname(file.originalname);
        cb(null, `${prefix}-${Date.now()}${ext}`);
    },
});

const upload = multer({ storage });

// Rutas públicas
router.get('/public/:slug', getPublicMenu);
router.post('/public/:slug/visit', trackVisit);

// Rutas protegidas
router.get('/settings', authMiddleware, filterByRestaurant, getSettings);
router.put('/settings', authMiddleware, filterByRestaurant, updateSettings);
router.post('/upload/logo', authMiddleware, filterByRestaurant, upload.single('file'), uploadLogo);
router.post('/upload/banner', authMiddleware, filterByRestaurant, upload.single('file'), uploadBanner);
router.get('/qr', authMiddleware, filterByRestaurant, getQr);
router.get('/stats', authMiddleware, filterByRestaurant, getStats);

module.exports = router;
