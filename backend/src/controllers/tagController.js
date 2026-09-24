const tagModel = require('../models/tagModel');
const orderModel = require('../models/orderModel');

// CREATE TAG
const createTagController = async (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tag name is required'
            });
        }

        const tagData = {
            name,
            restaurant: req.user.restaurant,
        };

        if (color) {
            tagData.color = color;
        }

        const newTag = new tagModel(tagData);
        await newTag.save();

        res.status(201).json({
            success: true,
            message: 'Tag created successfully',
            newTag
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una etiqueta llamada "${req.body.name}"`,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error in Create Tag',
            error
        });
    }
}



// GET ALL TAGS
const getAllTagsController = async (req, res) => {
    try {
        const tags = await tagModel.find({ restaurant: req.user.restaurant }).sort({ name: 1 });

        res.status(200).json({
            success: true,
            totalTags: tags.length,
            tags
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in Get All Tags',
            error
        });
    }
}



// UPDATE TAG
const updateTagController = async (req, res) => {
    try {
        const { name, color, isActive } = req.body;

        const tag = await tagModel.findOne({
            _id: req.params.id,
            restaurant: req.user.restaurant
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Tag not found'
            });
        }

        if (name) tag.name = name;
        if (color) tag.color = color;
        if (isActive !== undefined) tag.isActive = isActive;

        await tag.save();

        res.status(200).json({
            success: true,
            message: 'Tag updated successfully',
            tag
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una etiqueta llamada "${req.body.name}"`,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error in Update Tag',
            error
        });
    }
};



// DELETE TAG
const deleteTagController = async (req, res) => {
    try {
        const tag = await tagModel.findOne({
            _id: req.params.id,
            restaurant: req.user.restaurant
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Tag not found'
            });
        }

        const linkedOrders = await orderModel.countDocuments({
            tag: req.params.id,
            restaurant: req.user.restaurant
        });

        if (linkedOrders > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar la etiqueta "${tag.name}" porque tiene ${linkedOrders} venta(s) asociada(s). Puede desactivarla en su lugar.`,
                linkedOrdersCount: linkedOrders
            });
        }

        await tagModel.findOneAndDelete({
            _id: req.params.id,
            restaurant: req.user.restaurant
        });

        res.status(200).json({
            success: true,
            message: 'Tag deleted successfully',
            tag
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in Delete Tag',
            error
        });
    }
};

module.exports = {
    createTagController,
    getAllTagsController,
    updateTagController,
    deleteTagController
};
