import express from "express";
import { sendNotification, getUserNotifications, getAllNotifications } from "../controllers/notificationController.js";

const router = express.Router();

router.post("/send", sendNotification);
router.get("/view/:role", getUserNotifications); // Fetch notifications for Students/Drivers
router.get("/all", getAllNotifications); // 📌 New: Fetch all notifications

export default router;
