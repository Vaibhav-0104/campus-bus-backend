import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  from: { type: String, required: true, default: "Uka Tarsadia University" },
  to: { type: String, required: true },
  capacity: { type: Number, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  driver: { type: String }, // Temporarily keep for migration
  allocatedSeats: { type: [String], default: [] }, // Added to store allocated seat numbers
});

export default mongoose.model('Bus', busSchema);