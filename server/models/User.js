const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Contraseña es obligatoria'],
        minlength: [8, 'Mínimo 8 caracteres']
    },
    name: {
        type: String,
        trim: true,
        default: ''
    },
    plan: {
        type: String,
        enum: ['free', 'premium', 'platinum'],
        default: 'free'
    },
    vehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
