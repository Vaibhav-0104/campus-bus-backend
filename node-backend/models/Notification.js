import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // Emergency, Delay, etc.
  message: { type: String, required: true },
  recipients: { type: [String], required: true }, // Students, Drivers, Both
  date: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
