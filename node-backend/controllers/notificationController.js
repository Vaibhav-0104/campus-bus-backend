// 📌 File: backend/controllers/notificationController.js
import Notification from "../models/Notification.js";
import sendPushNotification from "../config/firebase.js";

// Send Notification
export const sendNotification = async (req, res) => {
  const { type, message, recipients } = req.body;

  if (!type || !message || !recipients || recipients.length === 0) {
    return res.status(400).json({ error: "All fields (type, message, recipients) are required!" });
  }

  // Validate recipients
  const validRecipients = ["Students", "Drivers", "Both"];
  if (!recipients.every(recipient => validRecipients.includes(recipient))) {
    return res.status(400).json({ error: "Invalid recipient. Must be 'Students', 'Drivers', or 'Both'." });
  }

  try {
    const notification = new Notification({ type, message, recipients });
    await notification.save();

    // Send push notification via Firebase
    await sendPushNotification(recipients, message);

    res.status(201).json({ message: "Notification sent successfully!", notification });
  } catch (error) {
    console.error("Error in sendNotification:", error);
    res.status(500).json({ error: "Server error while sending notification" });
  }
};

// Get Notifications for a Specific User
export const getUserNotifications = async (req, res) => {
  const { role } = req.params; // 'Students' or 'Drivers'

  if (!role) {
    return res.status(400).json({ error: "Role is required!" });
  }

  // Validate role
  if (!["Students", "Drivers"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be 'Students' or 'Drivers'." });
  }

  try {
    const notifications = await Notification.find({
      recipients: { $in: [role, "Both"] }
    }).sort({ date: -1 });

    // Format date for frontend
    const formattedNotifications = notifications.map(notification => ({
      ...notification._doc,
      date: new Date(notification.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    res.status(500).json({ error: "Server error while fetching notifications" });
  }
};


// 📌 New: Get All Notifications (No Filtering by Role)
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ date: -1 });

    // Format date for frontend
    const formattedNotifications = notifications.map(notification => ({
      ...notification._doc,
      date: new Date(notification.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));

    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    res.status(500).json({ error: "Server error while fetching all notifications" });
  }
};