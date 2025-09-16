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

module.exports = router;
