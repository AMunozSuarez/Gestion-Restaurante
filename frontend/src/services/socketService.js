import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

let socket = null;
// Listeners registered before connectSocket is called
const pendingListeners = [];

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token || socket) return;

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  // Register any listeners that were added before socket was created
  pendingListeners.forEach(({ event, callback }) => {
    socket.on(event, callback);
  });

  socket.on('connect', () => {
    console.log('Socket.io conectado');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket.io error de conexión:', err.message);
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onSocketEvent = (event, callback) => {
  if (!socket) {
    // Socket not yet initialized — queue the listener
    const entry = { event, callback };
    pendingListeners.push(entry);
    return () => {
      const idx = pendingListeners.indexOf(entry);
      if (idx >= 0) pendingListeners.splice(idx, 1);
      socket?.off(event, callback);
    };
  }
  socket.on(event, callback);
  return () => socket?.off(event, callback);
};

export const getSocketId = () => socket?.id || null;

export const getSocket = () => socket;

// Tracks order IDs updated by this browser tab to avoid double-printing
// (ordersService prints directly AND socket event would also print)
const pendingOwnUpdates = new Set();

export const markOwnUpdate = (orderId) => {
  pendingOwnUpdates.add(String(orderId));
  setTimeout(() => pendingOwnUpdates.delete(String(orderId)), 10000);
};

export const isOwnUpdate = (orderId) => pendingOwnUpdates.has(String(orderId));
