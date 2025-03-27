const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createFoodController, getAllFoodsController, getFoodByIdController, getFoodByRestaurantIdController, updateFoodController, deleteFoodController, placeOrderController, OrderStatusController, orderStatusController } = require('../controllers/foodControllers');
const adminMiddleware = require('../middlewares/adminMiddleware');
const router = express.Router();

// CREATE A NEW FOOD
router.post('/create', authMiddleware, createFoodController);

// GET ALL FOODS
router.get('/getAll', authMiddleware, getAllFoodsController);

// GET A FOOD BY ID
router.get('/get/:id', authMiddleware, getFoodByIdController);

// GET A FOOD BY RESTAURANT ID
router.get('/getByRestaurant/:restaurantId', authMiddleware, getFoodByRestaurantIdController);

// UPDATE A FOOD BY ID
router.put('/update/:id', authMiddleware, updateFoodController);

// DELETE A FOOD BY ID
router.delete('/delete/:id', authMiddleware, deleteFoodController);





module.exports = router; // Export the router