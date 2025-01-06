const express = require('express');
const { getUserController } = require('../controllers/userControllers');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();


// GET USER
router.get('/getUser', authMiddleware, getUserController);


module.exports = router; // Export the router