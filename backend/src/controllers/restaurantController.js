const Restaurant = require('../models/restaurantModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Crear un restaurante con un usuario por defecto
const createRestaurantWithUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { restaurantName, address, userName, email, password } = req.body;

        // Validar los datos requeridos
        if (!restaurantName || !address || !userName || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        // Crear el restaurante sin el propietario
        const newRestaurant = new Restaurant({
            name: restaurantName,
            address,
            subscriptionPlan: 'Basic', // Plan por defecto
        });

        const savedRestaurant = await newRestaurant.save({ session });

        // Crear el usuario asociado al restaurante
        const hashedPassword = await bcrypt.hash(password, 10); // Encriptar la contraseña
        const newUser = new User({
            userName,
            email,
            password: hashedPassword, // Contraseña encriptada
            restaurant: savedRestaurant._id, // Asigna el restaurante al usuario
            role: 'owner', // El primer usuario será el propietario
        });

        const savedUser = await newUser.save({ session });

        // Actualizar el restaurante con el propietario
        savedRestaurant.owner = savedUser._id;
        await savedRestaurant.save({ session });

        // Confirmar la transacción
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: 'Restaurante y usuario creados exitosamente.',
            restaurant: savedRestaurant,
            user: savedUser,
        });
    } catch (error) {
        // Revertir la transacción en caso de error
        await session.abortTransaction();
        session.endSession();
        console.error('Error al crear el restaurante y usuario:', error);
        res.status(500).json({ message: 'Error al crear el restaurante y usuario.', error });
    }
};

const getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar el restaurante por ID
        const restaurant = await Restaurant.findById(id).populate('owner', 'userName email'); // Opcional: usa populate para incluir datos del propietario

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Restaurante encontrado.',
            restaurant,
        });
    } catch (error) {
        console.error('Error al obtener el restaurante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el restaurante.',
            error,
        });
    }
};

module.exports = { createRestaurantWithUser, getRestaurantById };