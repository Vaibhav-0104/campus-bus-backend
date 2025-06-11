import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import adminAuthRoutes from "./routes/adminRoutes.js";
import cors from "cors";
import path from "path";
import busRoutes from './routes/busRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import allocationRoutes from './routes/busAllocationRoutes.js';
import notificationRoutes from "./routes/notificationsRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(cors({ origin: "*" }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

app.use("/api/admin/auth", adminAuthRoutes);
app.use('/api/buses', busRoutes);
app.use('/api', driverRoutes);
app.use('/api/students', studentRoutes);
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use('/api/allocations', allocationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/fees", feeRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
