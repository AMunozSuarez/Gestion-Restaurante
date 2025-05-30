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

app.use('/api/test', require('./routes/testRoutes')); // Use the test routes
app.use('/api/auth', require('./routes/authRoutes')); // Use the auth routes
app.use('/api/user', require('./routes/userRoutes')); // Use the user routes
app.use('/api/restaurant', require('./routes/restaurantRoutes')); // Use the restaurant routes
app.use('/api/category', require('./routes/categoryRoutes')); // Use the category routes
app.use('/api/food', require('./routes/foodRoutes')); // Use the food routes
app.use('/api/order', require('./routes/orderRoutes')); // Use the order routes
app.use('/api/report', require('./routes/reportRoutes')); // Use the report routes
app.use('/api/cash', require('./routes/cashRoutes')); // Use the cash register routes
app.use('/api/customer', require('./routes/customerRoutes')); // Use the customer routes



app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});