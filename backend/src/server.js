const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { conexion } = require('./bdd/conexion'); // Import the connection function
const { configureMercadoPago } = require('./services/mercadoPagoService');
const { checkExpiredSubscriptions, sendExpirationReminders } = require('./scripts/checkExpiredSubscriptions');

require('dotenv').config(); // Load environment variables from the .env file

const app = express();

const port = process.env.PORT || 3001; // Use the port defined in the environment or 3001 by default

conexion(); // Establish the connection with MongoDB Atlas
configureMercadoPago(); // Configure MercadoPago with credentials

app.use(morgan('dev')); // Use Morgan for logging
app.use(cors()); // Use CORS to allow cross-origin requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/authRoutes')); // Use the auth routes
app.use('/api/user', require('./routes/userRoutes')); // Use the user routes
app.use('/api/restaurant', require('./routes/restaurantRoutes')); // Use the restaurant routes
app.use('/api/category', require('./routes/categoryRoutes')); // Use the category routes
app.use('/api/food', require('./routes/foodRoutes')); // Use the food routes
app.use('/api/order', require('./routes/orderRoutes')); // Use the order routes
app.use('/api/report', require('./routes/reportRoutes')); // Use the report routes
app.use('/api/cash', require('./routes/cashRoutes')); // Use the cash register routes
app.use('/api/customer', require('./routes/customerRoutes')); // Use the customer routes
app.use('/api/print', require('./routes/printRoutes')); // Use the print routes
app.use('/api/admin', require('./routes/adminRoutes')); // Use the admin routes
app.use('/api/subscriptions', require('./routes/subscriptionRoutes')); // Use the subscription routes
app.use('/api/webhooks', require('./routes/webhookRoutes')); // Use the webhook routes



app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    
    // Verificar suscripciones vencidas al iniciar el servidor
    checkExpiredSubscriptions().catch(err => console.error('Error al verificar suscripciones:', err));
    
    // Ejecutar verificación diaria de suscripciones (cada 24 horas)
    const DAILY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
    setInterval(() => {
        checkExpiredSubscriptions().catch(err => console.error('Error en verificación diaria:', err));
    }, DAILY_CHECK_INTERVAL);
    
    // Enviar recordatorios de vencimiento (cada 6 horas)
    const REMINDER_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
    setInterval(() => {
        sendExpirationReminders().catch(err => console.error('Error al enviar recordatorios:', err));
    }, REMINDER_INTERVAL);
    
    console.log('✅ Sistema de verificación de suscripciones activado');
});