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













// UPDATE USER PASSWORD
const updatePasswordController = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await userModel.findById({ _id: req.body.id });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid old password' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        res.status(200).send({ 
            success: true,
            message: 'Password updated successfully' });
    }
    catch (error) {
        console.log('Internal update password error', error);
    }
};

module.exports = { getUserController, updateUserController, updatePasswordController };