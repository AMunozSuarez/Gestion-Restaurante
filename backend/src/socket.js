const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/userModel');
const { isTokenVersionCurrent } = require('./services/sessionService');

let io = null;

// ─── Pantalla de cliente (rol carrito) ─────────────────────────────────────
// El mostrador emite el carrito y el servidor solo lo reenvía a la room de la
// pantalla vinculada. El restaurante sale siempre del JWT, nunca del payload,
// así que un restaurante no puede escribir ni leer la pantalla de otro.
// Se guarda el último estado de cada pantalla para que una que se conecta (o
// reconecta) muestre el carrito en curso sin esperar al próximo cambio.
const customerDisplayStates = new Map();
const CUSTOMER_DISPLAY_STATUSES = ['idle', 'cart', 'confirmed'];
const CUSTOMER_DISPLAY_MAX_BYTES = 50 * 1024;
const CUSTOMER_DISPLAY_MAX_ITEMS = 200;
const IDLE_CUSTOMER_DISPLAY_STATE = Object.freeze({ status: 'idle', items: [] });

const isObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

const customerDisplayRoom = (restaurantId, displayUserId) => `customer-display:${restaurantId}:${displayUserId}`;

const sanitizeCustomerDisplayState = (state) => {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    if (!CUSTOMER_DISPLAY_STATUSES.includes(state.status)) return null;
    if (state.items !== undefined && (!Array.isArray(state.items) || state.items.length > CUSTOMER_DISPLAY_MAX_ITEMS)) return null;

    try {
        if (Buffer.byteLength(JSON.stringify(state), 'utf8') > CUSTOMER_DISPLAY_MAX_BYTES) return null;
    } catch {
        return null;
    }

    return { ...state, items: state.items || [], updatedAt: Date.now() };
};

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Auth middleware: verify JWT on connection
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Token requerido'));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return next(new Error('Token inválido'));
        }

        try {
            // Mismo criterio que authMiddleware: usuario activo y sesión no revocada
            const user = await User.findById(decoded.id).select('isActive tokenVersion').lean();
            if (!user || user.isActive === false || !isTokenVersionCurrent(decoded, user)) {
                return next(new Error('Sesión revocada'));
            }
        } catch (err) {
            console.error('Error verificando sesión del socket:', err);
            return next(new Error('Error de autenticación'));
        }

        socket.user = decoded;
        next();
    });

    io.on('connection', (socket) => {
        const { id: userId, restaurant: restaurantId, role } = socket.user;

        // Room por usuario: permite cerrar remotamente sus sesiones (sessionService)
        if (userId) {
            socket.join(`user:${userId}`);
        }

        if (role === 'carrito') {
            // La pantalla de cliente no entra a la room del restaurante: no necesita
            // (ni debe) recibir los pedidos, solo el carrito de su propia room.
            if (restaurantId && userId) {
                const room = customerDisplayRoom(restaurantId, userId);
                socket.join(room);
                socket.emit('customer-display:state', customerDisplayStates.get(room) || IDLE_CUSTOMER_DISPLAY_STATE);
            }
        } else if (restaurantId) {
            socket.join(`restaurant:${restaurantId}`);
        }

        // Owner/empleado abriendo la pantalla de cliente en una pestaña: se une a la
        // room de la pantalla vinculada en su equipo.
        socket.on('customer-display:join', ({ targetUserId } = {}) => {
            if (role === 'carrito' || !restaurantId) return;

            if (socket.data.customerDisplayRoom) {
                socket.leave(socket.data.customerDisplayRoom);
                socket.data.customerDisplayRoom = null;
            }
            if (!isObjectId(targetUserId)) return;

            const room = customerDisplayRoom(restaurantId, targetUserId);
            socket.join(room);
            socket.data.customerDisplayRoom = room;
            socket.emit('customer-display:state', customerDisplayStates.get(room) || IDLE_CUSTOMER_DISPLAY_STATE);
        });

        socket.on('customer-display:update', ({ targetUserId, state } = {}) => {
            if (role === 'carrito' || !restaurantId || !isObjectId(targetUserId)) return;

            const sanitized = sanitizeCustomerDisplayState(state);
            if (!sanitized) return;

            const room = customerDisplayRoom(restaurantId, targetUserId);
            customerDisplayStates.set(room, sanitized);
            socket.to(room).emit('customer-display:state', sanitized);
        });

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
