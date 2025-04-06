const categoryModel = require('../models/categoryModel');

// CREATE CATEGORY
const createCategoryController = async (req, res) => {
    try {
        const { title, imageUrl } = req.body;
        if (!title) {
            return res.status(400).json({ 
                success: false,
                message: 'All Category fields are required' 
            });
        }

        const newCategory = new categoryModel({
            title,
            imageUrl,
            restaurant: req.user.restaurant, // Asocia la categoría al restaurante del usuario
        });

        await newCategory.save();

        res.status(201).json({ 
            success: true,
            message: 'Category created successfully',
            newCategory 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Create Category',
            error 
        });
    }
}




// GET ALL CATEGORIES
const getAllCategoriesController = async (req, res) => {
    try {
        const categories = await categoryModel.find({ restaurant: req.user.restaurant }); // Filtra por restaurante
        if (!categories || categories.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'No Categories found' 
            });
        }
        res.status(200).json({ 
            success: true,
            totalCategories: categories.length,
            categories 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Get All Categories',
            error 
        });
    }
}



// UPDATE CATEGORY
const updateCategoryController = async (req, res) => {
    try {
        const { title, imageUrl } = req.body;
        if (!title) {
            return res.status(400).json({ 
                success: false,
                message: 'All Category fields are required' 
            });
        }

        const category = await categoryModel.findOne({ 
            _id: req.params.id, 
            restaurant: req.user.restaurant // Verifica que la categoría pertenezca al restaurante
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        category.title = title;
        category.imageUrl = imageUrl;
        await category.save();

        res.status(200).json({ 
            success: true,
            message: 'Category updated successfully',
            category 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Update Category',
            error 
        });
    }
};



const deleteCategoryController = async (req, res) => {
    try {
        const category = await categoryModel.findOneAndDelete({ 
            _id: req.params.id, 
            restaurant: req.user.restaurant // Verifica que la categoría pertenezca al restaurante
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Category not found' 
            });
        }

        res.status(200).json({ 
            success: true,
            message: 'Category deleted successfully',
            category 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Delete Category',
            error 
        });
    }
};


module.exports = {
    createCategoryController,
    getAllCategoriesController,
    updateCategoryController,
    deleteCategoryController
};