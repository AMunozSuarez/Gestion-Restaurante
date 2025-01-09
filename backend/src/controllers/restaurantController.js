const restaurantModel = require('../models/restaurantModel');

// CREATE RESTAURANT
const createRestaurantController = async (req, res) => {
    try {
        const { title, imageUrl, foods, time, pickup, delivery, isOpen, logoUrl, rating, ratingCount, code, coords } = req.body;
        // validation
        if (!title || !coords) {
            return res.status(400).json({ 
                success: false,
                message: "Please enter all fields" });
        }
        // create restaurant
        const newRestaurant = new restaurantModel({
            title,
            imageUrl,
            foods,
            time,
            pickup,
            delivery,
            isOpen,
            logoUrl,
            rating,
            ratingCount,
            code,
            coords
        });
        await newRestaurant.save();
        res.status(200).json({ 
            success: true,
            message: "Restaurant created successfully" });

    } catch (error) {
        console.log('Internal server error', error);
        res.status(400).json({ 
            message: "error create restaurant" });
    }
};

module.exports = {
    createRestaurantController
};