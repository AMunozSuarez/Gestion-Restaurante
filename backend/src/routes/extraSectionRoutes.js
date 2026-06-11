const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
    createExtraSectionController,
    getAllExtraSectionsController,
    getExtraSectionByIdController,
    updateExtraSectionController,
    deleteExtraSectionController
} = require('../controllers/extraSectionControllers');

const router = express.Router();

router.post('/create', authMiddleware, createExtraSectionController);
router.get('/getAll', authMiddleware, getAllExtraSectionsController);
router.get('/get/:id', authMiddleware, getExtraSectionByIdController);
router.put('/update/:id', authMiddleware, updateExtraSectionController);
router.delete('/delete/:id', authMiddleware, deleteExtraSectionController);

module.exports = router;
