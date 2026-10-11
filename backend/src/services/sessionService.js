const userModel = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');

// Un token sin claim `tv` (emitido antes de existir tokenVersion) equivale a la versión 0,
// así los usuarios ya logueados no pierden la sesión al desplegar este cambio.
const getTokenVersion = (decoded) => Number(decoded?.tv) || 0;

const isTokenVersionCurrent = (decoded, user) =>
    getTokenVersion(decoded) === (Number(user?.tokenVersion) || 0);

// Cierra todas las sesiones de un usuario en todos sus dispositivos:
// - incrementa tokenVersion → los JWT ya emitidos dejan de ser válidos (API y socket)
// - borra sus refresh tokens → no puede renovar la sesión
// - avisa por socket y desconecta → las pantallas abiertas vuelven al login al instante
const revokeUserSessions = async (userId) => {
    await userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    await RefreshToken.deleteMany({ user: userId });

    try {
        // require perezoso: socket.js también importa este módulo (dependencia circular).
        const io = require('../socket').getIO();
        const room = `user:${userId}`;
        io.to(room).emit('session:revoked');
        io.in(room).disconnectSockets(true);
    } catch (error) {
        // Socket.io no inicializado (scripts/tests): la revocación en BD ya basta.
        console.warn('No se pudo notificar la revocación de sesión por socket:', error.message);
    }
};

module.exports = { getTokenVersion, isTokenVersionCurrent, revokeUserSessions };
