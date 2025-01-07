const express = require('express');
const { getUserController, updateUserController, updatePasswordController, resetPasswordController, deleteUserController } = require('../controllers/userControllers');
const authMiddleware = require('../middlewares/authMiddleware');

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


module.exports = router; // Export the router