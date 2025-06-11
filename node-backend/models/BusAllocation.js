import mongoose from 'mongoose';

const busAllocationSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    allocatedAt: { type: Date, default: Date.now }
});

const BusAllocation = mongoose.model('BusAllocation', busAllocationSchema);
export default BusAllocation;