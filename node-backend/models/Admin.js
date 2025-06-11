import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  name: { type: String, default: "Admin" },
}, { timestamps: true });

export default mongoose.model("Admin", AdminSchema);
