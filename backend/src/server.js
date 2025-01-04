const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { conexion } = require('./bdd/conexion'); // Import the connection function
const testRoutes = require('./routes/testRoutes'); // Import the test routes

require('dotenv').config(); // Load environment variables from the .env file

const app = express();

const port = process.env.PORT || 3001; // Use the port defined in the environment or 3001 by default

conexion(); // Establish the connection with MongoDB Atlas

app.use(morgan('dev')); // Use Morgan for logging
app.use(cors()); // Use CORS to allow cross-origin requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/test', testRoutes); // Use the test routes


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});