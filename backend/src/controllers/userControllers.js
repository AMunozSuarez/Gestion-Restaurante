const userModel = require("../models/userModel");
const RefreshToken = require('../models/refreshTokenModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildEmailRegex = (email) => new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, 'i');

// GET USER INFO
const getUserController = async (req, res) => {
    try {
        const user = await userModel.findById({ _id: req.body.id }).select('-password');
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User found',
            user });
    }
    catch (error) {
        console.log('Internal get user error', error);
    }
};






// UPDATE USER INFO
const updateUserController = async (req, res) => {
    try {
        const { userName, phone, address } = req.body;
        const user = await userModel.findByIdAndUpdate({ _id: req.body.id }, {
            userName,
            phone,
            address
        }, { new: true });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User updated successfully', 
            user });
    }
    catch (error) {
        console.log('Internal update user error', error);
    }
};













// UPDATE USER PASSWORD
const updatePasswordController = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await userModel.findById({ _id: req.body.id });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid old password' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        res.status(200).send({ 
            success: true,
            message: 'Password updated successfully' });
    }
    catch (error) {
        console.log('Internal update password error', error);
    }
};







// RESET PASSWORD
const resetPasswordController = async (req, res) => {
    try {
        const { email, answer, newPassword } = req.body;

        if (!email || !answer || !newPassword) {
            return res.status(400).send({ 
                success: false,
                message: 'Please enter all fields' });
        }


        const user = await userModel.findOne({
            email,
            answer
        });

        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid email or answer' });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.status(200).send({ 
            success: true,
            message: 'Password reset successfully' });
    }


    catch (error) {
        console.log('Internal reset password error', error);
    }
}







// DELETE USER
const deleteUserController = async (req, res) => {
    try {
        const user = await userModel.findByIdAndDelete({ _id: req.params.id });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User deleted successfully' });
    }
    catch (error) {
        console.log('Internal delete user error', error);
    }
}

// GET ALL USERS BY RESTAURANT
const getUsersByRestaurantController = async (req, res) => {
    try {
        const restaurantId = req.user.restaurant;
        
        if (!restaurantId) {
            return res.status(400).send({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const users = await userModel
            .find({ restaurant: restaurantId })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).send({
            success: true,
            message: 'Users found',
            users
        });
    } catch (error) {
        console.error('Error getting users by restaurant:', error);
        res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

const CREATABLE_EMPLOYEE_ROLES = ['employee', 'mesero', 'cocina'];

// UPDATE EMPLOYEE
const updateEmployeeController = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, email, phone, password, role } = req.body;
        const restaurantId = req.user.restaurant;
        const normalizedEmail = email ? normalizeEmail(email) : null;

        // Verificar que el usuario pertenece al mismo restaurante
        const user = await userModel.findOne({ _id: id, restaurant: restaurantId });

        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Solo se permite reasignar entre roles de empleado (no owner/super_admin)
        if (role && CREATABLE_EMPLOYEE_ROLES.includes(role) && user.role !== 'owner') {
            user.role = role;
        }

        if (normalizedEmail && normalizedEmail !== normalizeEmail(user.email || '')) {
            const existingUser = await userModel.findOne({
                _id: { $ne: id },
                email: buildEmailRegex(normalizedEmail)
            });

            if (existingUser) {
                return res.status(400).send({
                    success: false,
                    message: 'El correo electrónico ya está registrado.'
                });
            }
        }

        // Actualizar campos
        if (userName) user.userName = userName;
        if (normalizedEmail) user.email = normalizedEmail;
        if (phone !== undefined) user.phone = phone;

        // Si se proporciona una nueva contraseña, encriptarla
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        res.status(200).send({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user: {
                _id: user._id,
                userName: user.userName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                restaurant: user.restaurant
            }
        });
    } catch (error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).send({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const createEmployeeController = async (req, res) => {
    try {
        const { userName, email, password, phone, role } = req.body;
        const restaurantId = req.user.restaurant; // Restaurante del propietario autenticado
        const normalizedEmail = normalizeEmail(email || '');
        const normalizedRole = CREATABLE_EMPLOYEE_ROLES.includes(role) ? role : 'employee';

        // Validar campos requeridos
        if (!userName || !email || !password) {
            return res.status(400).send({
                success: false,
                message: 'Todos los campos son obligatorios.',
            });
        }

        if (!normalizedEmail) {
            return res.status(400).send({
                success: false,
                message: 'Debes ingresar un correo electrónico válido.',
            });
        }

        // Verificar si el email ya está registrado
        const existingUser = await userModel.findOne({ email: buildEmailRegex(normalizedEmail) });
        if (existingUser) {
            return res.status(400).send({
                success: false,
                message: 'El correo electrónico ya está registrado.',
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el empleado
        const employee = new userModel({
            userName,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            restaurant: restaurantId,
            role: normalizedRole,
        });

        await employee.save();

        res.status(201).send({
            success: true,
            message: 'Empleado creado exitosamente.',
            employee,
        });
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).send({
            success: false,
            message: 'Error interno del servidor.',
        });
    }
};

// TOGGLE USER ACTIVE/INACTIVE
const toggleUserActiveController = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id).select('isActive role');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        if (user.role === 'owner') {
            return res.status(403).json({ success: false, message: 'No se puede desactivar al propietario.' });
        }

        user.isActive = !user.isActive;
        await user.save();

        // Si se desactiva, revocar todos sus refresh tokens para forzar cierre de sesión
        if (!user.isActive) {
            await RefreshToken.deleteMany({ user: user._id });
        }

        res.status(200).json({
            success: true,
            isActive: user.isActive,
            message: user.isActive ? 'Usuario activado.' : 'Usuario desactivado y sesión cerrada.'
        });
    } catch (error) {
        console.error('Error in toggleUserActiveController:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

module.exports = {
    getUserController,
    updateUserController,
    updatePasswordController,
    resetPasswordController,
    deleteUserController,
    createEmployeeController,
    getUsersByRestaurantController,
    updateEmployeeController,
    toggleUserActiveController
}; // Export the controllers