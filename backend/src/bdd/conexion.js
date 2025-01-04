const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from the .env file

const uri = process.env.MONGODB_URI; // Get the MongoDB URI from the environment variables

const conexion = async () => {
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Connected to MongoDB Atla: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas', error);
    }
}

module.exports = { conexion };