const userModel = require("../models/userModel");

const registerController = async (req, res) => {
    try {
        const { userName, email, password, usertype, phone, address } = req.body;

        //validation
        if (!userName || !email || !password) {
            console.log(userName, email, password);
            return res.status(400).send({ 
                success: false,
                message: 'Please enter all fields' });
            
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
        console.log('Internal server error', error);
    }
};

module.exports = { registerController };