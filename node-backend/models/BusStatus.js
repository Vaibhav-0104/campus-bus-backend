import mongoose from 'mongoose';

const busStatusSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  status: { type: String, enum: ['Boarded', 'Dropped', 'Not Yet Boarded'], default: 'Not Yet Boarded' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

const BusStatus = mongoose.model('BusStatus', busStatusSchema);
export default BusStatus;