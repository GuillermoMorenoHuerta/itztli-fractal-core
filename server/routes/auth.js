const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// REGISTRO
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email y contraseña son obligatorios' 
            });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'Este email ya está registrado' 
            });
        }
        
        const user = new User({ email, password, name });
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
        
        res.status(201).json({
            message: '✅ Cuenta creada exitosamente',
            token,
            user: { id: user._id, email: user.email, plan: user.plan }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña obligatorios' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Email no encontrado' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
        
        res.json({
            message: '✅ Bienvenido',
            token,
            user: { id: user._id, email: user.email, name: user.name, plan: user.plan }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// PERFIL
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate('vehicles')
            .select('-password');
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
