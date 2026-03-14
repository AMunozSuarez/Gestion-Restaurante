const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Auth middleware: verify JWT on connection
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Token requerido'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        const restaurantId = socket.user.restaurant;
        if (restaurantId) {
            socket.join(`restaurant:${restaurantId}`);
        }

        socket.on('disconnect', () => {
            // cleanup handled automatically by socket.io
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io no ha sido inicializado');
    }
    return io;
};

module.exports = { initSocket, getIO };
