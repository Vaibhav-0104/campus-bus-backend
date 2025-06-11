import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true },
    license: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
});

// ✅ This is required for ES Modules
const Driver = mongoose.model('Driver', driverSchema);

export default Driver;   // <--- This is the important part
