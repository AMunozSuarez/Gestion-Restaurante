const categoryModel = require('../models/categoryModel');
const foodModel = require('../models/foodModel');

// CREATE CATEGORY
const createCategoryController = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ 
                success: false,
                message: 'Category title is required' 
            });
        }

        const newCategory = new categoryModel({
            title,
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
            return res.status(200).json({ 
                success: true,
                message: 'No Categories found for this restaurant',
                categories: [] 
            });
        }

        // Agregar conteo de productos para cada categoría
        const categoriesWithProductCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await foodModel.countDocuments({ 
                    category: category._id,
                    restaurant: req.user.restaurant
                });
                
                return {
                    ...category.toObject(),
                    productCount
                };
            })
        );

        res.status(200).json({ 
            success: true,
            totalCategories: categories.length,
            categories: categoriesWithProductCount
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
        const { title, isAvailable } = req.body;
        
        // Solo requerir title si no se está actualizando solo la disponibilidad
        if (!title && isAvailable === undefined) {
            return res.status(400).json({ 
                success: false,
                message: 'Category title is required' 
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

        // Si se está desactivando la categoría, desactivar todos los productos de esa categoría
        if (isAvailable !== undefined && !isAvailable && category.isAvailable) {
            // Contar productos que serán afectados
            const affectedProductsCount = await foodModel.countDocuments({
                category: req.params.id,
                restaurant: req.user.restaurant,
                isAvailable: true
            });

            // Desactivar todos los productos de esta categoría
            await foodModel.updateMany(
                { 
                    category: req.params.id,
                    restaurant: req.user.restaurant
                },
                { isAvailable: false }
            );

            // Actualizar la categoría
            if (title) category.title = title;
            category.isAvailable = isAvailable;
            await category.save();

            res.status(200).json({ 
                success: true,
                message: `Category updated successfully. ${affectedProductsCount} products were also disabled.`,
                category,
                affectedProductsCount
            });
        } else {
            // Actualización normal sin afectar productos
            if (title) category.title = title;
            if (isAvailable !== undefined) {
                category.isAvailable = isAvailable;
            }
            await category.save();

            res.status(200).json({ 
                success: true,
                message: 'Category updated successfully',
                category 
            });
        }

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

        // Verificar si hay productos enlazados a esta categoría
        const linkedProducts = await foodModel.countDocuments({ 
            category: req.params.id,
            restaurant: req.user.restaurant
        });

        if (linkedProducts > 0) {
            return res.status(400).json({ 
                success: false,
                message: `No se puede eliminar la categoría "${category.title}" porque tiene ${linkedProducts} producto(s) enlazado(s). Primero elimine o reasigne los productos a otra categoría.`,
                linkedProductsCount: linkedProducts
            });
        }

        // Si no hay productos enlazados, proceder con la eliminación
        await categoryModel.findOneAndDelete({ 
            _id: req.params.id, 
            restaurant: req.user.restaurant
        });

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