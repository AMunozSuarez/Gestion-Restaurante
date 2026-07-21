const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createCategoryController, getAllCategoriesController, updateCategoryController, deleteCategoryController, batchUpdatePrintDestinationsController } = require('../controllers/categoryController');
const router = express.Router();

// CREATE CATEGORY
router.post('/create', authMiddleware, denyRoleMiddleware('mesero'), createCategoryController);

// GET ALL CATEGORIES
router.get('/getAll', authMiddleware, getAllCategoriesController);

// UPDATE CATEGORY
router.put('/update/:id', authMiddleware, denyRoleMiddleware('mesero'), updateCategoryController);

// BATCH UPDATE PRINT DESTINATIONS
router.put('/print-destinations/batch', authMiddleware, denyRoleMiddleware('mesero'), batchUpdatePrintDestinationsController);

// DELETE CATEGORY
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero'), deleteCategoryController);




module.exports = router; // Export the router