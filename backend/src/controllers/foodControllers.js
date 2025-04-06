const foodModel = require('../models/foodModel');
const orderModel = require('../models/orderModel');

// CREATE A NEW FOOD
const createFoodController = async (req, res) => {
    try {
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable } = req.body;

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
            restaurant: req.user.restaurant // Asocia el alimento al restaurante del usuario logueado
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
        const foods = await foodModel.find({ restaurant: req.user.restaurant }).populate('category', 'title'); // Filtra por restaurante
        if (!foods || foods.length === 0) {
            return res.status(404).send({ 
                success: false,
                message: 'No food found for this restaurant' 
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
        const food = await foodModel.findOne({ _id: req.params.id, restaurant: req.user.restaurant }); // Filtra por restaurante
        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found or does not belong to this restaurant' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Food retrieved successfully',
            food
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};







// GET A FOOD BY RESTAURANT ID
const getFoodByRestaurantIdController = async (req, res) => {
    try {
        const foods = await foodModel.find({ restaurant: req.user.restaurant }); // Usa el restaurante del usuario logueado
        if (!foods || foods.length === 0) {
            return res.status(404).send({ 
                success: false,
                message: 'No food found for this restaurant' 
            });
        }
        res.status(200).send({ 
            success: true,
            message: 'Foods retrieved successfully',
            totalFoods: foods.length,
            foods
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}









// UPDATE A FOOD BY ID
const updateFoodController = async (req, res) => {
    try {
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable } = req.body;

        const food = await foodModel.findOneAndUpdate(
            { _id: req.params.id, restaurant: req.user.restaurant }, // Filtra por restaurante
            { title, description, price, imageUrl, foodTags, category, code, isAvailable },
            { new: true }
        );

        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found or does not belong to this restaurant' 
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
            error
        });
    }
};






// DELETE A FOOD BY ID
const deleteFoodController = async (req, res) => {
    try {
        const food = await foodModel.findOneAndDelete({ _id: req.params.id, restaurant: req.user.restaurant }); // Filtra por restaurante
        if (!food) {
            return res.status(404).send({ 
                success: false,
                message: 'Food not found or does not belong to this restaurant' 
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
            error
        });
    }
};







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