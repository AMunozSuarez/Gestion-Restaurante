const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const foodModel = require('../models/foodModel');
const orderModel = require('../models/orderModel');
const categoryModel = require('../models/categoryModel');
const ExtraSection = require('../models/extraSectionModel');

// CREATE A NEW FOOD
const createFoodController = async (req, res) => {
    try {
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable, showInDigitalMenu, extraSections } = req.body;
        const parsedPrice = Number(price);
        const restaurantId = req.user.restaurant;

        if (!title || !category || price === undefined || price === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).send({
                success: false,
                message: 'Please enter a valid food title, non-negative price and category'
            });
        }

        // Validar y normalizar las asignaciones de secciones
        let sectionAssignments = [];
        if (extraSections && Array.isArray(extraSections) && extraSections.length > 0) {
            const sectionIds = extraSections.map(a => a.section || a);
            const found = await ExtraSection.find({
                _id: { $in: sectionIds },
                restaurant: restaurantId
            }).lean();
            if (found.length !== sectionIds.length) {
                return res.status(400).send({
                    success: false,
                    message: 'Una o más secciones de extras no pertenecen a este restaurante'
                });
            }
            sectionAssignments = extraSections.map(a => ({
                section: a.section || a,
                maxSelectionOverride: a.maxSelectionOverride ?? null,
                visibleExtraIds: a.visibleExtraIds || []
            }));
        }

        const food = new foodModel({
            title,
            description,
            price: parsedPrice,
            imageUrl,
            foodTags,
            category,
            code,
            isAvailable,
            showInDigitalMenu,
            extraSections: sectionAssignments,
            restaurant: restaurantId
        });

        await food.save();
        await food.populate('extraSections.section');
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
        const foods = await foodModel.find({ restaurant: req.user.restaurant })
            .populate('category', 'title')
            .populate('extraSections.section');

        if (!foods || foods.length === 0) {
            console.log('No hay alimentos disponibles para este restaurante.'); // Mensaje en consola
            return res.status(200).send({ 
                success: true,
                message: 'No foods found for this restaurant',
                totalFoods: 0,
                foods: [] // Devuelve un array vacío
            });
        }

        res.status(200).send({ 
            success: true,
            message: 'Foods retrieved successfully',
            totalFoods: foods.length,
            foods
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error in Get All foods',
            error
        });
    }
};








// GET A FOOD BY ID
const getFoodByIdController = async (req, res) => {
    try {
        const food = await foodModel.findOne({ _id: req.params.id, restaurant: req.user.restaurant })
            .populate('extraSections.section');
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
        const foods = await foodModel.find({ restaurant: req.user.restaurant }).populate('extraSections.section');
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
        const { title, description, price, imageUrl, foodTags, category, code, isAvailable, showInDigitalMenu, extraSections } = req.body;
        const restaurantId = req.user.restaurant;

        if (price !== undefined) {
            const parsedPrice = Number(price);
            if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).send({
                    success: false,
                    message: 'Price must be a non-negative number'
                });
            }
        }

        // Validar y normalizar asignaciones de secciones
        let sectionAssignments;
        if (extraSections !== undefined) {
            if (Array.isArray(extraSections) && extraSections.length > 0) {
                const sectionIds = extraSections.map(a => a.section || a);
                const found = await ExtraSection.find({
                    _id: { $in: sectionIds },
                    restaurant: restaurantId
                }).select('_id').lean();
                if (found.length !== sectionIds.length) {
                    return res.status(400).send({
                        success: false,
                        message: 'Una o más secciones de extras no pertenecen a este restaurante'
                    });
                }
                sectionAssignments = extraSections.map(a => ({
                    section: a.section || a,
                    maxSelection: a.maxSelection ?? null,
                    visibleExtraIds: a.visibleExtraIds || []
                }));
            } else {
                sectionAssignments = [];
            }
        }

        // Si se está intentando activar el producto, verificar que la categoría esté activa
        if (isAvailable === true) {
            const food = await foodModel.findOne({ 
                _id: req.params.id, 
                restaurant: req.user.restaurant 
            }).populate('category');

            if (!food) {
                return res.status(404).send({ 
                    success: false,
                    message: 'Food not found or does not belong to this restaurant' 
                });
            }

            // Verificar si la categoría está activa
            let categoryToCheck = food.category;
            
            // Si se está cambiando la categoría, verificar la nueva categoría
            if (category && category !== food.category._id.toString()) {
                categoryToCheck = await categoryModel.findOne({
                    _id: category,
                    restaurant: req.user.restaurant
                });
            }

            if (!categoryToCheck || !categoryToCheck.isAvailable) {
                return res.status(400).send({ 
                    success: false,
                    message: 'No se puede activar el producto porque su categoría está desactivada. Primero active la categoría correspondiente.' 
                });
            }
        }

        // Preparar objeto de actualización
        const updateData = { title, description, imageUrl, foodTags, category, code, isAvailable, showInDigitalMenu };

        if (price !== undefined) {
            updateData.price = Number(price);
        }
        
        if (sectionAssignments !== undefined) {
            updateData.extraSections = sectionAssignments;
        }

        const updatedFood = await foodModel.findOneAndUpdate(
            { _id: req.params.id, restaurant: restaurantId },
            updateData,
            { new: true }
        ).populate('extraSections.section');

        if (!updatedFood) {
            return res.status(404).send({
                success: false,
                message: 'Food not found or does not belong to this restaurant'
            });
        }
        res.status(200).send({
            success: true,
            message: 'Food updated successfully',
            food: updatedFood
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







// UPLOAD A FOOD IMAGE (optimizada: redimensionada y comprimida, solo se guarda la URL en la BD)
const uploadFoodImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ success: false, message: 'No se recibió ningún archivo' });
        }

        const restaurantId = String(req.user.restaurant);
        const uploadDir = path.join(__dirname, '../../uploads/products', restaurantId);
        fs.mkdirSync(uploadDir, { recursive: true });

        const filename = `food-${Date.now()}.webp`;
        const filePath = path.join(uploadDir, filename);

        await sharp(req.file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(filePath);

        res.status(200).send({
            success: true,
            imageUrl: `/uploads/products/${restaurantId}/${filename}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al subir la imagen del producto',
            error: error.message
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
    uploadFoodImageController,


    placeOrderController,
    orderStatusController
};