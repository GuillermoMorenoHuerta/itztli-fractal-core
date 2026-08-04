const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos DESDE LA RAÍZ DEL PROYECTO
app.use(express.static(path.join(__dirname, '..')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Ruta para login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// Ruta por defecto → index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// WebSocket para comunicación en tiempo real
io.on('connection', (socket) => {
    console.log('🔗 Cliente conectado:', socket.id);
    
    socket.on('vehicle:register', (data) => {
        console.log('🚗 Vehículo registrado:', data.vin);
        socket.join(`vehicle:${data.vin}`);
    });
    
    socket.on('vehicle:status', (data) => {
        io.to(`vehicle:${data.vin}`).emit('status:update', data);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🗄️  MongoDB conectado'))
    .catch(err => console.error('❌ MongoDB error:', err));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 ITZTLI FRACTAL CORE SERVER');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`🚗 Vehicles: http://localhost:${PORT}/api/vehicles`);
    console.log('═══════════════════════════════════════');
});
