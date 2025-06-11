// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["Present", "Absent"], default: "Present" },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
