import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace('/api', '');

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token || socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
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
  if (!socket) return () => {};
  socket.on(event, callback);
  return () => socket.off(event, callback);
};

export const getSocketId = () => socket?.id || null;

export const getSocket = () => socket;
