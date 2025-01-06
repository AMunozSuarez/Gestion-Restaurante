const express = require('express');
const { getUserController, updateUserController } = require('../controllers/userControllers');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();


// GET USER
router.get('/getUser', authMiddleware, getUserController);

// UPDATE USER
router.put('/updateUser', authMiddleware, updateUserController);


module.exports = router; // Export the router