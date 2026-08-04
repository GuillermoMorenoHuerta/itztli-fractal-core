const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vin: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 17,
        maxlength: 17
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    brand: String,
    model: String,
    year: Number,
    connectionType: {
        type: String,
        enum: ['wifi_integrated', 'adapter_cloud', 'adapter_esp32', 'car_wifi_esp32'],
        default: 'wifi_integrated'
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'offline'
    },
    qrCode: String,
    authToken: {
        type: String,
        unique: true
    },
    ipAddress: String,
    lastSeen: Date,
    location: {
        lat: Number,
        lng: Number,
        updatedAt: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
