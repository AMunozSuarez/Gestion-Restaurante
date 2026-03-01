const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from the .env file

const uri = process.env.MONGODB_URI; // Get the MongoDB URI from the environment variables

const conexion = async () => {
    try {
        await mongoose.connect(uri, {
            // Pool de conexiones para SaaS con múltiples restaurantes concurrentes
            maxPoolSize: 50,       // Hasta 50 conexiones simultáneas (default: 5)
            minPoolSize: 5,        // Mantener 5 conexiones siempre listas
            maxIdleTimeMS: 30000,  // Cerrar conexiones ociosas después de 30s
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`Connected to MongoDB Atlas: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas', error);
    }
}

module.exports = { conexion };