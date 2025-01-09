const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createFoodController, getAllFoodsController, getFoodByIdController, getFoodByRestaurantIdController } = require('../controllers/foodControllers');
const router = express.Router();

// CREATE A NEW FOOD
router.post('/create', authMiddleware, createFoodController);

// GET ALL FOODS
router.get('/getAll', authMiddleware, getAllFoodsController);

// GET A FOOD BY ID
router.get('/get/:id', authMiddleware, getFoodByIdController);

// GET A FOOD BY RESTAURANT ID
router.get('/getByRestaurant/:restaurantId', authMiddleware, getFoodByRestaurantIdController);



module.exports = router; // Export the router