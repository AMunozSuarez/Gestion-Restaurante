const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { conexion } = require('./bdd/conexion'); // Import the connection function

require('dotenv').config(); // Load environment variables from the .env file

const app = express();

const port = process.env.PORT || 3001; // Use the port defined in the environment or 3001 by default

conexion(); // Establish the connection with MongoDB Atlas

app.use(morgan('dev')); // Use Morgan for logging
app.use(cors()); // Use CORS to allow cross-origin requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const rutas = require('./routes/rutas'); // Import the routes
// app.use('/api', rutas); // Use the routes

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});