const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createFoodController, getAllFoodsController, getFoodByIdController, getFoodByRestaurantIdController, updateFoodController, deleteFoodController, uploadFoodImageController, placeOrderController, OrderStatusController, orderStatusController } = require('../controllers/foodControllers');
const adminMiddleware = require('../middlewares/adminMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('El archivo debe ser una imagen'));
        }
        cb(null, true);
    }
});

// CREATE A NEW FOOD
router.post('/create', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, createFoodController);

// UPLOAD A FOOD IMAGE
router.post('/upload-image', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, upload.single('file'), uploadFoodImageController);

// GET ALL FOODS
router.get('/getAll', authMiddleware, filterByRestaurant, getAllFoodsController);

// GET A FOOD BY ID
router.get('/get/:id', authMiddleware, getFoodByIdController);

// GET A FOOD BY RESTAURANT ID
router.get('/getByRestaurant/:restaurantId', authMiddleware, getFoodByRestaurantIdController);

// UPDATE A FOOD BY ID
router.put('/update/:id', authMiddleware, denyRoleMiddleware('mesero'), updateFoodController);

// DELETE A FOOD BY ID
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero'), deleteFoodController);





module.exports = router; // Export the router