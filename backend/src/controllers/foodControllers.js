const foodModel = require('../models/foodModel');
const orderModel = require('../models/orderModel');

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
        // Usa populate para obtener los datos de la categoría asociada
        const foods = await foodModel.find().populate('category', 'title'); // Obtén solo el título de la categoría
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
            message: 'Error in Get All foods',
            error
        });
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









// UPDATE A FOOD BY ID
const updateFoodController = async (req, res) => {
    try {
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable, restaurant } = req.body;
        
        const food = await foodModel.findByIdAndUpdate(req.params.id, {
            title,
            description,
            price,
            imageUrl,
            foodTags,
            category,
            code,
            isAvailable,
            restaurant
        }, { new: true });
        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Food updated successfully',
            food
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            message: 'Error in update food controller',
            error });
    }
}







// DELETE A FOOD BY ID
const deleteFoodController = async (req, res) => {
    try {
        const food = await foodModel.findByIdAndDelete(req.params.id);
        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Food deleted successfully',
            food
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            message: 'Error in delete food controller',
            error });
    }
}








//------------------------------------------------------------------------------------------------------------------------------------------ 









const placeOrderController = async (req, res) => {
    try {
        console.log('Request Body:', req.body); // Depura los datos recibidos
        const { cart, payment, buyer, section, customerName, customerPhone, orderDetails } = req.body;

        if (!cart || cart.length === 0) {
            return res.status(400).send({ 
                success: false,
                message: 'Please provide a valid cart'
            });
        }

        // Calcula el total del pedido
        let total = 0;
        cart.forEach((item) => {
            total += item.price;
        });

        // Crea un nuevo pedido
        const newOrder = new orderModel({
            foods: cart.map(item => item._id), // Solo guarda los IDs de los alimentos
            payment,
            buyer,
            status: 'Preparacion'
        });

        await newOrder.save();

        res.status(201).send({ 
            success: true,
            message: 'Order placed successfully',
            newOrder
        });
    } catch (error) {
        console.error('Error placing order:', error); // Depura el error
        res.status(500).json({ 
            success: false,
            message: 'Error placing order',
            error: error.message
        });
    }
};








// CHANGE ORDER STATUS
const orderStatusController = async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!orderId) {
      return res.status(404).send({
        success: false,
        message: "Please Provide valid order id",
      });
    }
    const { status } = req.body;
    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Order Status Updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Order Status API",
      error,
    });
  }
};

        










// Export functions
module.exports = {
    createFoodController,
    getAllFoodsController,
    getFoodByIdController,
    getFoodByRestaurantIdController,
    updateFoodController,
    deleteFoodController,


    placeOrderController,
    orderStatusController
};