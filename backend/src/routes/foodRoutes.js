const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createFoodController, getAllFoodsController, getFoodByIdController, getFoodByRestaurantIdController, updateFoodController, deleteFoodController, placeOrderController, OrderStatusController, orderStatusController } = require('../controllers/foodControllers');
const adminMiddleware = require('../middlewares/adminMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const router = express.Router();

// CREATE A NEW FOOD
router.post('/create', authMiddleware, denyRoleMiddleware('mesero'), filterByRestaurant, createFoodController);

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