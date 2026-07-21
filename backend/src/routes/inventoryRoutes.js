const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
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
    toggleFoodRecipeEnabled,
    toggleExtraRecipeEnabled,
} = require('../controllers/inventoryController');

const router = express.Router();

// El módulo de inventario no forma parte del módulo de mesas del rol mesero
router.use(authMiddleware, denyRoleMiddleware('mesero'));

// Insumos
router.get('/items', filterByRestaurant, getItems);
router.post('/items', filterByRestaurant, createItem);
router.put('/items/:id', filterByRestaurant, updateItem);
router.delete('/items/:id', filterByRestaurant, deleteItem);
router.post('/items/:id/adjust', filterByRestaurant, adjustStock);

// Movimientos
router.get('/movements', filterByRestaurant, getMovements);

// Recetas de productos
router.get('/recipe/food/:foodId', filterByRestaurant, getFoodRecipe);
router.put('/recipe/food/:foodId', filterByRestaurant, updateFoodRecipe);
router.patch('/recipe/food/:foodId/toggle', filterByRestaurant, toggleFoodRecipeEnabled);

// Recetas de extras
router.get('/recipe/extra/:sectionId/:extraId', filterByRestaurant, getExtraRecipe);
router.put('/recipe/extra/:sectionId/:extraId', filterByRestaurant, updateExtraRecipe);
router.patch('/recipe/extra/:sectionId/:extraId/toggle', filterByRestaurant, toggleExtraRecipeEnabled);

module.exports = router;
