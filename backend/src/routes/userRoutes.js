const express = require('express');
const { getUserController, updateUserController, updatePasswordController, resetPasswordController, deleteUserController, createEmployeeController } = require('../controllers/userControllers');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// GET USER
router.get('/getUser', authMiddleware, getUserController);

// UPDATE USER
router.put('/updateUser', authMiddleware, updateUserController);

// PASSWORD UPDATE
router.put('/updatePassword', authMiddleware, updatePasswordController);

// RESET PASSWORD
router.post('/resetPassword', authMiddleware, resetPasswordController);

// DELETE USER
router.delete('/deleteUser/:id', authMiddleware, deleteUserController);

// Crear un empleado (solo propietarios)
router.post('/createEmployee', authMiddleware, roleMiddleware('owner'), createEmployeeController);

module.exports = router; // Export the router