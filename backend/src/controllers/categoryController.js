const categoryModel = require('../models/categoryModel');

// CREATE CATEGORY
const createCategoryController = async (req, res) => {
    try {
        const { title, imageUrl } = req.body;
        if (!title) {
            return res.status(400).json({ 
                success: false,
                message: 'All Category fields are required' });
        }
        const newCategory = new categoryModel({
            title,
            imageUrl
        });

        await newCategory.save();

        res.status(201).json({ 
            success: true,
            message: 'Category created successfully',
            newCategory });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Create Category',
            error });
    }
}


module.exports = {
    createCategoryController,
};