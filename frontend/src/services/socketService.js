import { io } from 'socket.io-client';

const SOCKET_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

let socket = null;
// Keep all listeners so they can be re-attached after a forced reconnect.
const listenersRegistry = [];
let retryTimeout = null;

const addListenerToRegistry = (event, callback) => {
  const exists = listenersRegistry.some(
    (entry) => entry.event === event && entry.callback === callback
  );
  if (!exists) {
    listenersRegistry.push({ event, callback });
  }
};

const removeListenerFromRegistry = (event, callback) => {
  const idx = listenersRegistry.findIndex(
    (entry) => entry.event === event && entry.callback === callback
  );
  if (idx >= 0) {
    listenersRegistry.splice(idx, 1);
  }
};

// Re-attach all module-level listeners to a fresh socket.
const reattachListeners = () => {
  listenersRegistry.forEach(({ event, callback }) => {
    socket.on(event, callback);
  });
};

const scheduleReconnect = (delay = 5000, { forceNew = true } = {}) => {
  if (retryTimeout) return; // ya hay uno pendiente
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    connectSocket({ forceNew });
  }, delay);
};

export const connectSocket = ({ forceNew = false } = {}) => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Si ya hay un socket activo y conectado, no hacer nada.
  if (socket && socket.connected && !forceNew) return;

  // Si ya existe socket pero está desconectado, intentar reconectar el mismo
  // para preservar el manager interno antes de crear uno nuevo.
  if (socket && !forceNew) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  // Si existe pero vamos a recrear, limpiarlo primero.
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
    timeout: 20000,
  });

  // Registrar listeners del módulo y de componentes.
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

    // Mantener token actualizado para próximos intentos automáticos.
    const latestToken = localStorage.getItem('token');
    if (latestToken) {
      socket.auth = { token: latestToken };
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket.io desconectado:', reason);

    // No reintentar si fue desconexión explícita del cliente (logout).
    if (reason === 'io client disconnect') return;

    // Si el servidor cerró la conexión intencionalmente, reconectar manualmente.
    if (reason === 'io server disconnect') {
      scheduleReconnect(2000);
      return;
    }

    // Fallback para casos donde el manager queda en estado muerto.
    if (reason === 'transport close' || reason === 'transport error' || reason === 'ping timeout') {
      scheduleReconnect(4000);
    }
  });

  socket.io.on('reconnect_attempt', () => {
    const latestToken = localStorage.getItem('token');
    if (latestToken) {
      socket.auth = { token: latestToken };
    }
  });

  socket.io.on('reconnect_error', (err) => {
    console.warn('Socket.io reconnect_error:', err?.message || err);
  });

  socket.io.on('reconnect_failed', () => {
    console.error('Socket.io reconnect_failed: forzando recreación de socket...');
    scheduleReconnect(1000, { forceNew: true });
  });
};

export const disconnectSocket = () => {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onSocketEvent = (event, callback) => {
  addListenerToRegistry(event, callback);

  // Ensure listeners are registered before establishing/rehydrating
  // the socket connection, so early events are not missed at app startup.
  connectSocket();

  if (socket) {
    socket.off(event, callback);
    socket.on(event, callback);
  }

  return () => {
    removeListenerFromRegistry(event, callback);
    socket?.off(event, callback);
  };
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
    scheduleReconnect(1000, { forceNew: false });
  }
});

// Cuando el usuario vuelve a la pestaña y el socket no está conectado, reconectar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && socket && !socket.connected) {
    console.log('Tab activa — intentando reconectar socket...');
    scheduleReconnect(500, { forceNew: false });
  }
});
