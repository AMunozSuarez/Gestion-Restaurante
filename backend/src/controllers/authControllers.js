const userModel = require("../models/userModel");


// Register controller
const registerController = async (req, res) => {
    try {
        const { userName, email, password, usertype, phone, address } = req.body;

        //validation
        if (!userName || !email || !password) {
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

        //create new user
        const user = await userModel.create({
            userName,
            email,
            password,
            address,
            phone,
            usertype
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

        //check if password is correct
        if (user.password !== password) {
            return res.status(400).send({ 
                success: false,
                message: 'Invalid password' });
        }

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