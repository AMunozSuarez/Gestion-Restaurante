const userModel = require('../models/userModel');
const restaurantModel = require('../models/restaurantModel');
const Subscription = require('../models/subscriptionModel');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildEmailRegex = (email) => new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, 'i');

// =================== GESTIÓN DE USUARIOS ===================

// Obtener todos los usuarios del sistema
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, restaurant, search } = req.query;
        
        let filter = {};
        
        // Filtros opcionales
        if (role && role !== 'all') {
            filter.role = role;
        }
        
        if (restaurant && restaurant !== 'all') {
            filter.restaurant = restaurant;
        }
        
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await userModel
            .find(filter)
            .populate('restaurant', 'name address')
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await userModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: 'Usuarios obtenidos exitosamente',
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
    try {
        const { userName, email, password, role, restaurant, phone } = req.body;
        const normalizedEmail = normalizeEmail(email || '');

        // Validaciones
        if (!userName || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser completados'
            });
        }

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Debes ingresar un correo electrónico válido'
            });
        }

        // Verificar si el email ya existe
        const existingUser = await userModel.findOne({ email: buildEmailRegex(normalizedEmail) });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Verificar que el restaurante existe si se proporciona
        if (restaurant) {
            const restaurantExists = await restaurantModel.findById(restaurant);
            if (!restaurantExists) {
                return res.status(400).json({
                    success: false,
                    message: 'El restaurante especificado no existe'
                });
            }
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario
        const newUser = new userModel({
            userName,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            restaurant,
            phone: phone || ''
        });

        await newUser.save();

        // Obtener usuario creado sin contraseña
        const createdUser = await userModel
            .findById(newUser._id)
            .populate('restaurant', 'name address')
            .select('-password');

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: createdUser
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Actualizar usuario
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, email, role, restaurant, phone, isActive } = req.body;
        const normalizedEmail = email ? normalizeEmail(email) : null;

        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar email único si se está cambiando
        if (normalizedEmail && normalizedEmail !== normalizeEmail(user.email || '')) {
            const existingUser = await userModel.findOne({
                _id: { $ne: id },
                email: buildEmailRegex(normalizedEmail)
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El correo electrónico ya está registrado'
                });
            }
        }

        // Actualizar campos
        const updateData = {};
        if (userName) updateData.userName = userName;
        if (normalizedEmail) updateData.email = normalizedEmail;
        if (role) updateData.role = role;
        if (restaurant) updateData.restaurant = restaurant;
        if (phone !== undefined) updateData.phone = phone;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await userModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('restaurant', 'name address')
            .select('-password');

        res.status(200).json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Evitar que se elimine a sí mismo
        if (id === req.body.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminarte a ti mismo'
            });
        }

        await userModel.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// =================== GESTIÓN DE RESTAURANTES ===================

// Obtener todos los restaurantes
const getAllRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, isActive } = req.query;
        
        let filter = {};
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (isActive !== undefined && isActive !== 'all') {
            filter.isActive = isActive === 'true';
        }

        const restaurants = await restaurantModel
            .find(filter)
            .populate('owner', 'userName email')
            .populate('currentSubscription')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await restaurantModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: 'Restaurantes obtenidos exitosamente',
            restaurants,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error al obtener restaurantes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Crear restaurante con propietario
const createRestaurant = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { 
            restaurantName, 
            address,
            ownerName,
            ownerEmail,
            ownerPassword,
            ownerPhone
        } = req.body;
        const normalizedOwnerEmail = normalizeEmail(ownerEmail || '');

        // Validaciones
        if (!restaurantName || !address || !ownerName || !ownerEmail || !ownerPassword) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser completados'
            });
        }

        if (!normalizedOwnerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Debes ingresar un correo electrónico válido para el propietario'
            });
        }

        // Verificar si el email del propietario ya existe
        const existingUser = await userModel.findOne({ email: buildEmailRegex(normalizedOwnerEmail) });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El correo del propietario ya está registrado'
            });
        }

        // Crear el restaurante
        const newRestaurant = new restaurantModel({
            name: restaurantName,
            address,
            isActive: true
        });

        const savedRestaurant = await newRestaurant.save({ session });

        // Crear el propietario
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ownerPassword, salt);

        const newOwner = new userModel({
            userName: ownerName,
            email: normalizedOwnerEmail,
            password: hashedPassword,
            phone: ownerPhone || '',
            restaurant: savedRestaurant._id,
            role: 'owner'
        });

        const savedOwner = await newOwner.save({ session });

        // Actualizar el restaurante con el propietario
        savedRestaurant.owner = savedOwner._id;
        await savedRestaurant.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Obtener datos completos para respuesta
        const restaurantWithOwner = await restaurantModel
            .findById(savedRestaurant._id)
            .populate('owner', 'userName email phone')
            .populate('currentSubscription');

        res.status(201).json({
            success: true,
            message: 'Restaurante y propietario creados exitosamente',
            restaurant: restaurantWithOwner
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error al crear restaurante:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Actualizar restaurante
const updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, isActive, kitchenDisplayEnabled } = req.body;

        const restaurant = await restaurantModel.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (kitchenDisplayEnabled !== undefined) {
            updateData['settings.kitchenDisplay.enabled'] = Boolean(kitchenDisplayEnabled);
        }

        const updatedRestaurant = await restaurantModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('owner', 'userName email')
            .populate('currentSubscription');

        res.status(200).json({
            success: true,
            message: 'Restaurante actualizado exitosamente',
            restaurant: updatedRestaurant
        });
    } catch (error) {
        console.error('Error al actualizar restaurante:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// Eliminar restaurante
const deleteRestaurant = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        const restaurant = await restaurantModel.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        // Eliminar todos los usuarios asociados al restaurante
        await userModel.deleteMany({ restaurant: id }, { session });

        // Eliminar el restaurante
        await restaurantModel.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Restaurante y usuarios asociados eliminados exitosamente'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error al eliminar restaurante:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// =================== ESTADÍSTICAS ===================

// Obtener estadísticas del sistema
const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await userModel.countDocuments();
        const totalRestaurants = await restaurantModel.countDocuments();
        const activeRestaurants = await restaurantModel.countDocuments({ isActive: true });
        const inactiveRestaurants = await restaurantModel.countDocuments({ isActive: false });

        // Usuarios por rol
        const usersByRole = await userModel.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Restaurantes por plan de suscripción (desde currentSubscription)
        const restaurantsByPlan = await restaurantModel.aggregate([
            {
                $lookup: {
                    from: 'subscriptions',
                    localField: 'currentSubscription',
                    foreignField: '_id',
                    as: 'subscription'
                }
            },
            {
                $unwind: {
                    path: '$subscription',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: { $ifNull: ['$subscription.plan', 'sin_suscripcion'] },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Usuarios registrados en los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentUsers = await userModel.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        const recentRestaurants = await restaurantModel.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.status(200).json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            stats: {
                totalUsers,
                totalRestaurants,
                activeRestaurants,
                inactiveRestaurants,
                usersByRole,
                restaurantsByPlan,
                recentUsers,
                recentRestaurants
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error
        });
    }
};

// =================== ASIGNAR SUSCRIPCIÓN ===================

// Asignar suscripción a un restaurante (Super Admin)
const assignSubscription = async (req, res) => {
    try {
        const { restaurantId, plan, startDate, endDate, notes } = req.body;

        // Validaciones
        if (!restaurantId || !plan || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Restaurante, plan, fecha de inicio y fecha de fin son obligatorios'
            });
        }

        // Verificar que el restaurante existe
        const restaurant = await restaurantModel.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        // Obtener configuración del plan
        const planConfig = Subscription.schema.statics.getPlanConfig(plan);

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (parsedEndDate <= parsedStartDate) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Desactivar suscripción anterior si existe
        if (restaurant.currentSubscription) {
            await Subscription.findByIdAndUpdate(restaurant.currentSubscription, {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: 'Reemplazada por asignación manual de super admin'
            });
        }

        // Crear nueva suscripción
        const newSubscription = new Subscription({
            restaurant: restaurantId,
            plan,
            status: 'active',
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            amount: planConfig.price,
            currency: 'CLP',
            paymentProvider: 'manual',
            autoRenew: false,
            features: planConfig.features,
            paymentHistory: [{
                date: new Date(),
                amount: planConfig.price,
                status: 'success',
                paymentId: `manual-admin-${Date.now()}`,
                invoiceUrl: '',
            }],
        });

        await newSubscription.save();

        // Actualizar el restaurante con la nueva suscripción
        restaurant.currentSubscription = newSubscription._id;
        restaurant.subscriptionStatus = 'active';
        restaurant.subscriptionStartDate = parsedStartDate;
        restaurant.subscriptionEndDate = parsedEndDate;
        restaurant.isActive = true;
        await restaurant.save();

        res.status(201).json({
            success: true,
            message: `Suscripción "${planConfig.name}" asignada exitosamente a ${restaurant.name}`,
            subscription: newSubscription
        });
    } catch (error) {
        console.error('Error al asignar suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = {
    // Usuarios
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    
    // Restaurantes
    getAllRestaurants,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    
    // Estadísticas
    getSystemStats,

    // Suscripciones
    assignSubscription
};
