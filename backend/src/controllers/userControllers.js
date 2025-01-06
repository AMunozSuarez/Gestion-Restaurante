const userModel = require("../models/userModel");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// GET USER INFO
const getUserController = async (req, res) => {
    try {
        const user = await userModel.findById({ _id: req.body.id }).select('-password');
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User found',
            user });
    }
    catch (error) {
        console.log('Internal get user error', error);
    }
};






// UPDATE USER INFO
const updateUserController = async (req, res) => {
    try {
        const { userName, phone, address } = req.body;
        const user = await userModel.findByIdAndUpdate({ _id: req.body.id }, {
            userName,
            phone,
            address
        }, { new: true });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User updated successfully', 
            user });
    }
    catch (error) {
        console.log('Internal update user error', error);
    }
};

module.exports = { getUserController, updateUserController };