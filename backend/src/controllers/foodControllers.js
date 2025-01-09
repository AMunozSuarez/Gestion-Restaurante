const foodModel = require('../models/foodModel');

// CREATE A NEW FOOD
const createFood = async (req, res) => {
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

module.exports = {
    createFood
};