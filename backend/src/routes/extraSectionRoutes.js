const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const {
    createExtraSectionController,
    getAllExtraSectionsController,
    getExtraSectionByIdController,
    updateExtraSectionController,
    deleteExtraSectionController
} = require('../controllers/extraSectionControllers');

const router = express.Router();

router.post('/create', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), createExtraSectionController);
router.get('/getAll', authMiddleware, getAllExtraSectionsController);
router.get('/get/:id', authMiddleware, getExtraSectionByIdController);
router.put('/update/:id', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), updateExtraSectionController);
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), deleteExtraSectionController);

module.exports = router;
