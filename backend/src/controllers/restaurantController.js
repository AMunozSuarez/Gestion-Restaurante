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




// GET ALL RESTAURANTS
const getAllRestaurantsController = async (req, res) => {
    try {
        const restaurants = await restaurantModel.find();
        if (!restaurants) {
            return res.status(400).json({ 
                success: false,
                message: "No restaurants found" });
        }
        res.status(200).json({ 
            success: true,
            totalCount: restaurants.length,
            restaurants });
            
    } catch (error) {
        console.log('Internal server error', error);
        res.status(400).json({ 
            message: "error get all restaurants" });
    }
};






// GET A RESTAURANT BY ID
const getRestaurantByIdController = async (req, res) => {
    try {
        const restaurant = await restaurantModel.findById(req.params.id);
        if (!restaurant) {
            return res.status(400).json({ 
                success: false,
                message: "No restaurant found" });
        }
        res.status(200).json({ 
            success: true,
            restaurant });
            
    } catch (error) {
        console.log('Internal server error', error);
        res.status(400).json({ 
            message: "error get restaurant by id" });
    }
};







// DELETE A RESTAURANT BY ID
const deleteRestaurantByIdController = async (req, res) => {
    try {
        const restaurant = await restaurantModel.findByIdAndDelete(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ 
                success: false,
                message: "No restaurant found" });
        }
        res.status(200).json({ 
            success: true,
            message: "Restaurant deleted successfully" });
            
    } catch (error) {
        console.log('Internal server error', error);
        res.status(400).json({ 
            message: "error delete restaurant by id" });
    }
};



module.exports = {
    createRestaurantController,
    getAllRestaurantsController,
    getRestaurantByIdController,
    deleteRestaurantByIdController
};