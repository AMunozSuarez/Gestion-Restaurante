const express = require('express');
const {
    getUserController,
    updateUserController,
    updatePasswordController,
    resetPasswordController,
    deleteUserController,
    createEmployeeController,
    getUsersByRestaurantController,
    updateEmployeeController,
    toggleUserActiveController
} = require('../controllers/userControllers');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// GET USER
router.get('/getUser', authMiddleware, getUserController);

// GET ALL USERS BY RESTAURANT
router.get('/getUsersByRestaurant', authMiddleware, roleMiddleware('owner'), getUsersByRestaurantController);

// UPDATE USER
router.put('/updateUser', authMiddleware, updateUserController);

// UPDATE EMPLOYEE (for owner)
router.put('/updateEmployee/:id', authMiddleware, roleMiddleware('owner'), updateEmployeeController);

// PASSWORD UPDATE
router.put('/updatePassword', authMiddleware, updatePasswordController);

// RESET PASSWORD
router.post('/resetPassword', authMiddleware, resetPasswordController);

// DELETE USER
router.delete('/deleteUser/:id', authMiddleware, deleteUserController);

// Crear un empleado (solo propietarios)
router.post('/createEmployee', authMiddleware, roleMiddleware('owner'), createEmployeeController);

// Activar/desactivar usuario
router.patch('/toggleUserActive/:id', authMiddleware, roleMiddleware('owner'), toggleUserActiveController);

module.exports = router; // Export the router