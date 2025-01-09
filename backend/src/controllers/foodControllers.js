const foodModel = require('../models/foodModel');

// CREATE A NEW FOOD
const createFoodController = async (req, res) => {
    try {
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable, restaurant } = req.body;
        if (!title || !price || !category) {
            return res.status(400).send({ 
                success: false,
                message: 'Please enter the food title, price and category' 
            });
        }
        const food = new foodModel({
            title,
            description,
            price,
            imageUrl,
            foodTags,
            category,
            code,
            isAvailable,
            restaurant
        });
        
        await food.save();
        res.status(201).send({
            success: true,
            message: 'Food created successfully',
            food
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};









// GET ALL FOODS
const getAllFoodsController = async (req, res) => {
    try {
        const foods = await foodModel.find();
        if (!foods) {
            return res.status(404).send({ 
                success: false,
                message: 'No food found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Foods retrieved successfully',
            totalFoods: foods.length,
            foods
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            message: 'error in Get All foods',
            error});
    }
};








// GET A FOOD BY ID
const getFoodByIdController = async (req, res) => {
    try {
        const food = await foodModel.findById(req.params.id);
        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Food by ID successfully',
            food
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};







// GET A FOOD BY RESTAURANT ID
const getFoodByRestaurantIdController = async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;
        const foods = await foodModel.find({ restaurant: restaurantId });
        if (!foods) {
            return res.status(404).send({ 
                success: false,
                message: 'No food found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Foods retrieved successfully',
            totalFoods: foods.length,
            foods
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
}







// Export functions
module.exports = {
    createFoodController,
    getAllFoodsController,
    getFoodByIdController,
    getFoodByRestaurantIdController
};