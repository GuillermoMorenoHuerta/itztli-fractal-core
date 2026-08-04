const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// REGISTRAR VEHÍCULO
router.post('/register', auth, async (req, res) => {
    try {
        const { vin, connectionType, brand, model, year } = req.body;
        
        if (!vin || vin.length !== 17) {
            return res.status(400).json({ error: 'VIN inválido (17 caracteres)' });
        }
        
        const existingVehicle = await Vehicle.findOne({ vin });
        if (existingVehicle) {
            return res.status(400).json({ error: 'VIN ya registrado' });
        }
        
        const authToken = uuidv4();
        const qrData = `ITZTLI:${vin}:${authToken}`;
        const qrCode = await QRCode.toDataURL(qrData);
        
        const vehicle = new Vehicle({
            vin, owner: req.user.userId, connectionType,
            brand, model, year, authToken, qrCode
        });
        
        await vehicle.save();
        await User.findByIdAndUpdate(req.user.userId, {
            $push: { vehicles: vehicle._id }
        });
        
        res.status(201).json({
            message: '✅ Vehículo registrado',
            vehicle: { vin: vehicle.vin, qrCode: vehicle.qrCode, authToken }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// CONECTAR VEHÍCULO
router.post('/connect', async (req, res) => {
    try {
        const { vin, authToken, ipAddress } = req.body;
        const vehicle = await Vehicle.findOne({ vin, authToken });
        
        if (!vehicle) {
            return res.status(401).json({ error: 'VIN o token inválido' });
        }
        
        vehicle.status = 'online';
        vehicle.ipAddress = ipAddress;
        vehicle.lastSeen = new Date();
        await vehicle.save();
        
        const user = await User.findById(vehicle.owner);
        
        res.json({
            message: '✅ Conectado',
            vehicle: { vin: vehicle.vin, status: vehicle.status },
            plan: user.plan
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// MIS VEHÍCULOS
router.get('/my-vehicles', auth, async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ owner: req.user.userId });
        res.json({ vehicles });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
