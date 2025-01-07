const userModel = require("../models/userModel");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Register controller
const registerController = async (req, res) => {
    try {
        const { userName, email, password, usertype, phone, address, answer } = req.body;

        //validation
        if (!userName || !email || !password || !answer) {
            console.log(userName, email, password);
            return res.status(400).send({ 
                success: false,
                message: 'Please enter all fields (register)' });
            
        }

        //check if email already exists
        const existing = await userModel.findOne({email});
        if (existing) {
            return res.status(400).send({ 
                success: false,
                message: 'email already exists' });
        }

        // hashing the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //create new user
        const user = await userModel.create({
            userName,
            email,
            password: hashedPassword,
            address,
            phone,
            usertype,
            answer
        });
        res.status(201).send({ 
            success: true,
            message: 'User created successfully',
            user });
    } catch (error) {
        console.log('Internal register error', error);
    }
};









// Login controller
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        //validation
        if (!email || !password) {
            return res.status(400).send({ 
                success: false,
                message: 'Please enter all fields (login)' });
        }

        //check if email exists
        const user = await userModel.findOne({email});
        if (!user) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid email' });
        }


        //check user password, compare the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid password' });
        }



        //create token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).send({ 
            success: true,
            message: 'Login successful',
            token, user });
        
        user.password = undefined;


        res.status(200).send({ 
            success: true,
            message: 'Login successful',
            user });
    } catch (error) {
        console.log('Internal login error', error);
    }
}





module.exports = { 
    registerController,
    loginController
};