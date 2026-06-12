const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');
const {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
    getMovements,
    getFoodRecipe,
    updateFoodRecipe,
    getExtraRecipe,
    updateExtraRecipe,
} = require('../controllers/inventoryController');

const router = express.Router();

// Insumos
router.get('/items', authMiddleware, filterByRestaurant, getItems);
router.post('/items', authMiddleware, filterByRestaurant, createItem);
router.put('/items/:id', authMiddleware, filterByRestaurant, updateItem);
router.delete('/items/:id', authMiddleware, filterByRestaurant, deleteItem);
router.post('/items/:id/adjust', authMiddleware, filterByRestaurant, adjustStock);

// Movimientos
router.get('/movements', authMiddleware, filterByRestaurant, getMovements);

// Recetas de productos
router.get('/recipe/food/:foodId', authMiddleware, filterByRestaurant, getFoodRecipe);
router.put('/recipe/food/:foodId', authMiddleware, filterByRestaurant, updateFoodRecipe);

// Recetas de extras
router.get('/recipe/extra/:sectionId/:extraId', authMiddleware, filterByRestaurant, getExtraRecipe);
router.put('/recipe/extra/:sectionId/:extraId', authMiddleware, filterByRestaurant, updateExtraRecipe);

module.exports = router;
