const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createRestaurantController, getAllRestaurantsController, getRestaurantByIdController } = require('../controllers/restaurantController');
const router = express.Router();


// CREATE A NEW RESTAURANT (POST)
router.post('/create', authMiddleware, createRestaurantController);

// GET ALL RESTAURANTS (GET)
router.get('/getAll', authMiddleware, getAllRestaurantsController);

// GET A RESTAURANT BY ID (GET)
router.get('/get/:id', authMiddleware, getRestaurantByIdController);




module.exports = router; // Export the router