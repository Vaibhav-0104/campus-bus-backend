import mongoose from 'mongoose';

const driverLocationSchema = new mongoose.Schema({
    driverId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Driver', 
        required: true, 
        unique: true // Ensures one location document per driver
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    shareStatus: { type: Boolean, default: false },
    address: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on every save
driverLocationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);

export default DriverLocation;