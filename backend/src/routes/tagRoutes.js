const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const denyRoleMiddleware = require('../middlewares/denyRoleMiddleware');
const { createTagController, getAllTagsController, updateTagController, deleteTagController } = require('../controllers/tagController');
const router = express.Router();

// CREATE TAG
router.post('/create', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), createTagController);

// GET ALL TAGS (accesible para todos los roles autenticados, incluido mesero)
router.get('/getAll', authMiddleware, getAllTagsController);

// UPDATE TAG
router.put('/update/:id', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), updateTagController);

// DELETE TAG
router.delete('/delete/:id', authMiddleware, denyRoleMiddleware('mesero', 'cocina'), deleteTagController);

module.exports = router;
