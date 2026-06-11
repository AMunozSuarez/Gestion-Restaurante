const ExtraSection = require('../models/extraSectionModel');
const foodModel = require('../models/foodModel');

const createExtraSectionController = async (req, res) => {
    try {
        const { sectionName, extras } = req.body;
        const restaurantId = req.user.restaurant;

        if (!sectionName || !sectionName.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre de la sección es requerido' });
        }

        if (extras && Array.isArray(extras)) {
            for (const extra of extras) {
                if (!extra.name || !extra.name.trim()) {
                    return res.status(400).json({ success: false, message: 'Cada extra debe tener un nombre' });
                }
                if (extra.price !== undefined && extra.price < 0) {
                    return res.status(400).json({ success: false, message: 'El precio del extra no puede ser negativo' });
                }
            }
        }

        const section = new ExtraSection({
            restaurant: restaurantId,
            sectionName: sectionName.trim(),
            extras: extras || []
        });

        await section.save();
        res.status(201).json({ success: true, message: 'Sección de extras creada', section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllExtraSectionsController = async (req, res) => {
    try {
        const sections = await ExtraSection.find({ restaurant: req.user.restaurant }).sort({ sectionName: 1 });
        res.status(200).json({ success: true, sections });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getExtraSectionByIdController = async (req, res) => {
    try {
        const section = await ExtraSection.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
        if (!section) {
            return res.status(404).json({ success: false, message: 'Sección no encontrada' });
        }
        res.status(200).json({ success: true, section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateExtraSectionController = async (req, res) => {
    try {
        const { sectionName, extras } = req.body;
        const restaurantId = req.user.restaurant;

        if (sectionName !== undefined && !sectionName.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre de la sección no puede estar vacío' });
        }

        if (extras && Array.isArray(extras)) {
            for (const extra of extras) {
                if (!extra.name || !extra.name.trim()) {
                    return res.status(400).json({ success: false, message: 'Cada extra debe tener un nombre' });
                }
                if (extra.price !== undefined && extra.price < 0) {
                    return res.status(400).json({ success: false, message: 'El precio del extra no puede ser negativo' });
                }
            }
        }

        const updateData = {};
        if (sectionName !== undefined) updateData.sectionName = sectionName.trim();
        if (extras !== undefined) updateData.extras = extras;

        const section = await ExtraSection.findOneAndUpdate(
            { _id: req.params.id, restaurant: restaurantId },
            updateData,
            { new: true }
        );

        if (!section) {
            return res.status(404).json({ success: false, message: 'Sección no encontrada' });
        }

        res.status(200).json({ success: true, message: 'Sección actualizada', section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteExtraSectionController = async (req, res) => {
    try {
        const restaurantId = req.user.restaurant;

        // Verificar si algún producto usa esta sección
        const inUse = await foodModel.findOne({
            restaurant: restaurantId,
            'extraSections.section': req.params.id
        }).select('_id title').lean();

        if (inUse) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar: la sección está asignada al producto "${inUse.title}". Desasígnala primero.`
            });
        }

        const section = await ExtraSection.findOneAndDelete({ _id: req.params.id, restaurant: restaurantId });
        if (!section) {
            return res.status(404).json({ success: false, message: 'Sección no encontrada' });
        }

        res.status(200).json({ success: true, message: 'Sección eliminada', section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createExtraSectionController,
    getAllExtraSectionsController,
    getExtraSectionByIdController,
    updateExtraSectionController,
    deleteExtraSectionController
};
