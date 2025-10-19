// // 



// import express from "express";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";

// // Route Imports
// import adminAuthRoutes from "./routes/adminRoutes.js";
// import busRoutes from './routes/busRoutes.js';
// import driverRoutes from './routes/driverRoutes.js';
// import studentRoutes from './routes/studentRoutes.js';
// import allocationRoutes from './routes/busAllocationRoutes.js';
// import notificationRoutes from "./routes/notificationsRoutes.js";
// import feeRoutes from "./routes/feeRoutes.js";

// // Setup __dirname in ES Module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Load environment variables
// dotenv.config();

// const app = express();
// app.use(express.json());

// // ✅ CORS setup for public API (Allow all or customize origin)
// app.use(cors({ origin: "*" }));

// // ✅ Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => console.log("✅ MongoDB connected"))
// .catch(err => console.error("❌ MongoDB connection error:", err));

// // ✅ Route Middleware
// app.use("/api/admin/auth", adminAuthRoutes);
// app.use("/api/buses", busRoutes);
// app.use("/api", driverRoutes);
// app.use("/api/students", studentRoutes);
// app.use("/api/allocations", allocationRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/fees", feeRoutes);

// // ✅ Serve Uploaded Files
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // ✅ Basic Health Check Route
// app.get("/", (req, res) => {
//     res.send("✅ Campus Bus Backend API is running on Render!");
// });

// // ✅ Render Debug Log
// console.log("🌐 RENDER ENV:", process.env.RENDER === "true" ? "Running on Render" : "Running Locally");

// // ✅ Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });




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
import driverLocationRoutes from './routes/driverLocationRoutes.js'; // New import


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
app.use('/api/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use('/api/allocations', allocationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/fees", feeRoutes);
app.use('/api/driver-locations', driverLocationRoutes); // New route

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
