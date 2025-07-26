import mongoose from 'mongoose';

const busAllocationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  to: { type: String, required: true },
  seatNumber: { type: String, required: true },
}, { timestamps: true });

const BusAllocation = mongoose.model('BusAllocation', busAllocationSchema);
export default BusAllocation;