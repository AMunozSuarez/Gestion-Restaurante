const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from the .env file

const uri = process.env.MONGODB_URI; // Get the MongoDB URI from the environment variables

// El número de mesa dejó de ser único por restaurante y pasó a ser único por
// sección. Mongoose no elimina índices viejos, así que se retira el anterior
// (si existe) y se asegura el nuevo. Es idempotente.
const migrateTableNumberIndex = async () => {
    try {
        const Table = require('../models/tableModel');
        const indexes = await Table.collection.indexes();
        if (indexes.some((i) => i.name === 'tableNumber_1_restaurant_1')) {
            await Table.collection.dropIndex('tableNumber_1_restaurant_1');
            console.log('Índice antiguo de mesas (tableNumber + restaurant) eliminado');
        }
        await Table.createIndexes();
    } catch (error) {
        console.error('Error migrando índice de mesas', error);
    }
};

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
        await migrateTableNumberIndex();
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas', error);
    }
}

module.exports = { conexion };