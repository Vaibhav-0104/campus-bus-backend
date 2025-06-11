import express from "express";
import { setStudentFee, getStudentFee, createPayment, verifyPayment } from "../controllers/feeController.js";

const router = express.Router();

router.post("/set-fee", setStudentFee);
router.get("/student/:envNumber", getStudentFee); // ✅ Updated to use envNumber
router.post("/pay", createPayment);
router.post("/verify", verifyPayment);

export default router;
