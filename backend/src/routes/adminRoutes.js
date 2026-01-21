const express = require('express');
const {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getAllRestaurants,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    getSystemStats
} = require('../controllers/adminController');

const { checkExpiredSubscriptions, sendExpirationReminders } = require('../scripts/checkExpiredSubscriptions');

const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

// Middleware para todas las rutas de admin
router.use(authMiddleware, adminMiddleware);

// =================== RUTAS DE USUARIOS ===================
// Obtener todos los usuarios
router.get('/users', getAllUsers);

// Crear un nuevo usuario
router.post('/users', createUser);

// Actualizar usuario
router.put('/users/:id', updateUser);

// Eliminar usuario
router.delete('/users/:id', deleteUser);

// =================== RUTAS DE RESTAURANTES ===================
// Obtener todos los restaurantes
router.get('/restaurants', getAllRestaurants);

// Crear un nuevo restaurante
router.post('/restaurants', createRestaurant);

// Actualizar restaurante
router.put('/restaurants/:id', updateRestaurant);

// Eliminar restaurante
router.delete('/restaurants/:id', deleteRestaurant);

// =================== RUTAS DE ESTADÍSTICAS ===================
// Obtener estadísticas del sistema
router.get('/stats', getSystemStats);

// =================== RUTAS DE MANTENIMIENTO ===================
// Ejecutar verificación manual de suscripciones expiradas
router.post('/subscriptions/check-expired', async (req, res) => {
    try {
        const result = await checkExpiredSubscriptions();
        res.json({
            success: true,
            message: 'Verificación completada',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al verificar suscripciones',
            error: error.message,
        });
    }
});

// Enviar recordatorios de vencimiento
router.post('/subscriptions/send-reminders', async (req, res) => {
    try {
        const result = await sendExpirationReminders();
        res.json({
            success: true,
            message: 'Recordatorios enviados',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al enviar recordatorios',
            error: error.message,
        });
    }
});

module.exports = router;
