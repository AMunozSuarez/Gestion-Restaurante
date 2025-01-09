const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createFood } = require('../controllers/foodControllers');
const router = express.Router();

// CREATE A NEW FOOD
router.post('/create', authMiddleware, createFood);



module.exports = router; // Export the router