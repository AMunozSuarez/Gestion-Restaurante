const crypto = require('crypto');
const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const REFRESH_TOKEN_EXPIRY_DAYS = 90;
const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildEmailRegex = (email) => new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, 'i');

// Register Controller
const registerController = async (req, res) => {
    try {
        const { userName, email, password, restaurantId } = req.body;
        const normalizedEmail = normalizeEmail(email || '');

        if (!userName || !email || !password || !restaurantId) {
            return res.status(400).json({ message: 'Debes completar todos los campos obligatorios.' });
        }

        if (!normalizedEmail) {
            return res.status(400).json({ message: 'Debes ingresar un correo electrónico válido.' });
        }

        const existingUser = await User.findOne({ email: buildEmailRegex(normalizedEmail) });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userName,
            email: normalizedEmail,
            password: hashedPassword,
            restaurant: restaurantId,
        });

        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado exitosamente.', user: newUser });
    } catch (error) {
        console.error('Error in registerController:', error);

        if (error?.code === 11000) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Login Controller
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email || '');

        if (!email && !password) {
            return res.status(400).json({ message: 'Debes ingresar tu correo y contraseña.' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Debes ingresar tu correo electrónico.' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Debes ingresar tu contraseña.' });
        }

        if (!normalizedEmail) {
            return res.status(400).json({ message: 'El correo electrónico ingresado no es válido.' });
        }

        const user = await User.findOne({ email: buildEmailRegex(normalizedEmail) });
        if (!user) {
            return res.status(404).json({ message: 'No existe una cuenta asociada a ese correo electrónico.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña ingresada es incorrecta.' });
        }

        const token = jwt.sign(
            { id: user._id, restaurant: user.restaurant, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const rawRefreshToken = generateRefreshToken();
        await RefreshToken.create({
            tokenHash: hashToken(rawRefreshToken),
            user: user._id,
            restaurant: user.restaurant,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        });

        res.status(200).json({ message: 'Inicio de sesión exitoso.', token, refreshToken: rawRefreshToken });
    } catch (error) {
        console.error('Error in loginController:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Refresh Token Controller
const refreshController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token requerido.' });
        }

        const tokenHash = hashToken(refreshToken);
        const stored = await RefreshToken.findOne({ tokenHash });

        if (!stored) {
            return res.status(401).json({ message: 'Refresh token inválido.' });
        }

        if (stored.expiresAt < new Date()) {
            await RefreshToken.deleteOne({ tokenHash });
            return res.status(401).json({ message: 'Refresh token expirado.' });
        }

        const user = await User.findById(stored.user);
        if (!user) {
            await RefreshToken.deleteOne({ tokenHash });
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }

        const newToken = jwt.sign(
            { id: user._id, restaurant: user.restaurant, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ token: newToken });
    } catch (error) {
        console.error('Error in refreshController:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// Logout Controller
const logoutController = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await RefreshToken.deleteOne({ tokenHash: hashToken(refreshToken) });
        }
        res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
        console.error('Error in logoutController:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

module.exports = { registerController, loginController, refreshController, logoutController };