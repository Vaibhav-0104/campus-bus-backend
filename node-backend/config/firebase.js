import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read Firebase credentials from JSON file
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../firebase-service-key.json"), "utf8")
);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async (recipients, message) => {
  const payload = {
    notification: {
      title: "New Notification",
      body: message,
    },
    topic: "all", // Modify this to target specific users
  };

  try {
    await admin.messaging().send(payload);
    console.log("Push notification sent successfully!");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

export default sendPushNotification;
