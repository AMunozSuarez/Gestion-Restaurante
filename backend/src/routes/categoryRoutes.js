const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { createCategoryController, getAllCategoriesController, updateCategoryController, deleteCategoryController } = require('../controllers/categoryController');
const router = express.Router();

// CREATE CATEGORY
router.post('/create', authMiddleware, createCategoryController);

// GET ALL CATEGORIES
router.get('/getAll', authMiddleware, getAllCategoriesController);

// UPDATE CATEGORY
router.put('/update/:id', authMiddleware, updateCategoryController);

// DELETE CATEGORY
router.delete('/delete/:id', authMiddleware, deleteCategoryController);




module.exports = router; // Export the router