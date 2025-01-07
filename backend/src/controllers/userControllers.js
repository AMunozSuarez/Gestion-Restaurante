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







// RESET PASSWORD
const resetPasswordController = async (req, res) => {
    try {
        const { email, answer, newPassword } = req.body;

        if (!email || !answer || !newPassword) {
            return res.status(400).send({ 
                success: false,
                message: 'Please enter all fields' });
        }


        const user = await userModel.findOne({
            email,
            answer
        });

        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid email or answer' });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.status(200).send({ 
            success: true,
            message: 'Password reset successfully' });
    }


    catch (error) {
        console.log('Internal reset password error', error);
    }
}







// DELETE USER
const deleteUserController = async (req, res) => {
    try {
        const user = await userModel.findByIdAndDelete({ _id: req.params.id });
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'User not found' });
        }
        res.status(200).send({ 
            success: true,
            message: 'User deleted successfully' });
    }
    catch (error) {
        console.log('Internal delete user error', error);
    }
}





module.exports = { getUserController, updateUserController, updatePasswordController, resetPasswordController, deleteUserController }; // Export the controllers