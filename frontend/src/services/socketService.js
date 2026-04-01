import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

let socket = null;
// Listeners registered before connectSocket is called
const pendingListeners = [];
let retryTimeout = null;

// Re-attach all module-level and pending listeners to a fresh socket
const reattachListeners = () => {
  pendingListeners.forEach(({ event, callback }) => {
    socket.on(event, callback);
  });
};

const scheduleReconnect = (delay = 5000) => {
  if (retryTimeout) return; // ya hay uno pendiente
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    connectSocket();
  }, delay);
};

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Si ya hay un socket activo y conectado, no hacer nada
  if (socket && socket.connected) return;

  // Si existe pero está muerto, limpiarlo primero
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity, // nunca rendirse automáticamente
  });

  // Registrar listeners pendientes (suscritos antes de que el socket existiera)
  reattachListeners();

  socket.on('connect', () => {
    console.log('Socket.io conectado');
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket.io error de conexión:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket.io desconectado:', reason);
    // Si el servidor cerró la conexión intencionalmente, reconectar manualmente
    if (reason === 'io server disconnect') {
      scheduleReconnect(3000);
    }
    // Para 'transport close' / 'transport error' el cliente reintenta solo (reconnection: true)
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

// ─── Recuperación automática ante cambios de red ───────────────────────────
// ERR_NETWORK_CHANGED ocurre cuando el SO cambia de interfaz de red.
// El browser dispara el evento 'online' cuando recupera conectividad.
window.addEventListener('online', () => {
  console.log('Red detectada — intentando reconectar socket...');
  if (!socket || !socket.connected) {
    scheduleReconnect(1000);
  }
});

// Cuando el usuario vuelve a la pestaña y el socket no está conectado, reconectar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && socket && !socket.connected) {
    console.log('Tab activa — intentando reconectar socket...');
    scheduleReconnect(500);
  }
});
