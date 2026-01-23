const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const authMiddleware = require('../middlewares/authMiddleware');
const filterByRestaurant = require('../middlewares/filterByRestaurant');

// Aplicar middlewares de autenticación y filtro por restaurante
router.use(authMiddleware);
router.use(filterByRestaurant);

// Rutas CRUD de mesas
router.get('/', tableController.getTables);
router.get('/:id', tableController.getTableById);
router.post('/', tableController.createTable);
router.put('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);

// Rutas especiales para operaciones de mesa
router.post('/:id/open', tableController.openTable);
router.post('/:id/close', tableController.closeTable);
router.post('/:id/assign-order', tableController.assignOrderToTable);
router.put('/positions/bulk', tableController.updateTablePositions);

module.exports = router;
