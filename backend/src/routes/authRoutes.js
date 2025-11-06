
const express = require('express');

const { registerController, loginController } = require('../controllers/authControllers');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Register route
router.post('/register', registerController);

// Login route
router.post('/login', loginController);

// Verify token route
router.get('/verify', authMiddleware, (req, res) => {
    // Si llegamos aquí, el token es válido (gracias al middleware)
    res.status(200).json({ 
        success: true, 
        message: 'Token válido',
        user: req.user 
    });
});

module.exports = router;