const Restaurant = require('../models/restaurantModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const getRestaurantSettingsFromDoc = (restaurantDoc) => {
    if (!restaurantDoc) return Restaurant.getDefaultSettings();
    return Restaurant.normalizeSettings(restaurantDoc.settings || {});
};

const parseBooleanInput = (value) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
};

const applyRestaurantSettingsPatch = (currentSettings, payload = {}) => {
    const nextSettings = {
        printing: { ...currentSettings.printing },
        permissions: { ...currentSettings.permissions },
    };

    let hasChanges = false;

    const resolvedUpdatePrintMode = payload?.printing?.updatePrintMode ?? payload?.updatePrintMode;
    if (resolvedUpdatePrintMode !== undefined) {
        if (!['all', 'new-only'].includes(resolvedUpdatePrintMode)) {
            return { hasChanges: false, error: 'updatePrintMode debe ser "all" o "new-only".' };
        }
        nextSettings.printing.updatePrintMode = resolvedUpdatePrintMode;
        hasChanges = true;
    }

    const booleanFieldMap = [
        {
            nested: payload?.printing?.reprintTicketOnCloseTable,
            flat: payload?.reprintTicketOnCloseTable,
            assign: (value) => {
                nextSettings.printing.reprintTicketOnCloseTable = value;
            },
            fieldName: 'reprintTicketOnCloseTable',
        },
        {
            nested: payload?.printing?.printOnDeletedItemsUpdate,
            flat: payload?.printOnDeletedItemsUpdate,
            assign: (value) => {
                nextSettings.printing.printOnDeletedItemsUpdate = value;
            },
            fieldName: 'printOnDeletedItemsUpdate',
        },
        {
            nested: payload?.printing?.avoidDuplicateKitchenUpdatePrint,
            flat: payload?.avoidDuplicateKitchenUpdatePrint,
            assign: (value) => {
                nextSettings.printing.avoidDuplicateKitchenUpdatePrint = value;
            },
            fieldName: 'avoidDuplicateKitchenUpdatePrint',
        },
        {
            nested: payload?.permissions?.onlyOwnerCanCloseTable,
            flat: payload?.onlyOwnerCanCloseTable,
            assign: (value) => {
                nextSettings.permissions.onlyOwnerCanCloseTable = value;
            },
            fieldName: 'onlyOwnerCanCloseTable',
        },
    ];

    for (const field of booleanFieldMap) {
        const rawValue = field.nested !== undefined ? field.nested : field.flat;
        if (rawValue === undefined) continue;

        const parsed = parseBooleanInput(rawValue);
        if (parsed === null) {
            return { hasChanges: false, error: `${field.fieldName} debe ser booleano.` };
        }
        field.assign(parsed);
        hasChanges = true;
    }

    return { hasChanges, settings: nextSettings };
};

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

const getMyRestaurantSettings = async (req, res) => {
    try {
        if (!req.user || !req.user.restaurant) {
            return res.status(403).json({ success: false, message: 'No tienes acceso a ningún restaurante.' });
        }

        const restaurant = await Restaurant.findById(req.user.restaurant).select('settings');
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado.' });
        }

        const normalizedSettings = getRestaurantSettingsFromDoc(restaurant);

        return res.status(200).json({
            success: true,
            message: 'Configuración del restaurante obtenida correctamente.',
            settings: normalizedSettings,
        });
    } catch (error) {
        console.error('Error al obtener configuración del restaurante:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la configuración del restaurante.',
            error: error.message,
        });
    }
};

const updateMyRestaurantSettings = async (req, res) => {
    try {
        if (!req.user || !req.user.restaurant) {
            return res.status(403).json({ success: false, message: 'No tienes acceso a ningún restaurante.' });
        }

        const role = req.user.role;
        if (role !== 'owner' && role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Solo el dueño puede modificar la configuración compartida del restaurante.',
            });
        }

        const restaurant = await Restaurant.findById(req.user.restaurant).select('settings');
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado.' });
        }

        const currentSettings = getRestaurantSettingsFromDoc(restaurant);
        const patchResult = applyRestaurantSettingsPatch(currentSettings, req.body || {});

        if (patchResult.error) {
            return res.status(400).json({ success: false, message: patchResult.error });
        }

        if (!patchResult.hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'No se recibieron cambios válidos para actualizar.',
            });
        }

        restaurant.settings = patchResult.settings;
        await restaurant.save();

        return res.status(200).json({
            success: true,
            message: 'Configuración del restaurante actualizada correctamente.',
            settings: restaurant.settings,
        });
    } catch (error) {
        console.error('Error al actualizar configuración del restaurante:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la configuración del restaurante.',
            error: error.message,
        });
    }
};

module.exports = {
    createRestaurantWithUser,
    getRestaurantById,
    getMyRestaurantSettings,
    updateMyRestaurantSettings,
};