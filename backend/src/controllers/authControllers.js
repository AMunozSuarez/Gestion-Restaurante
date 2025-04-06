const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register Controller
const registerController = async (req, res) => {
    try {
        const { userName, email, password, restaurantId } = req.body;

        if (!userName || !email || !password || !restaurantId) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userName,
            email,
            password: hashedPassword,
            restaurant: restaurantId,
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully.', user: newUser });
    } catch (error) {
        console.error('Error in registerController:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// Login Controller
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user._id, restaurant: user.restaurant, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        console.error('Error in loginController:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = { registerController, loginController };