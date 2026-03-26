const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createCategoryController, getAllCategoriesController, updateCategoryController, deleteCategoryController, batchUpdatePrintDestinationsController } = require('../controllers/categoryController');
const router = express.Router();

// CREATE CATEGORY
router.post('/create', authMiddleware, createCategoryController);

// GET ALL CATEGORIES
router.get('/getAll', authMiddleware, getAllCategoriesController);

// UPDATE CATEGORY
router.put('/update/:id', authMiddleware, updateCategoryController);

// BATCH UPDATE PRINT DESTINATIONS
router.put('/print-destinations/batch', authMiddleware, batchUpdatePrintDestinationsController);

// DELETE CATEGORY
router.delete('/delete/:id', authMiddleware, deleteCategoryController);




module.exports = router; // Export the router