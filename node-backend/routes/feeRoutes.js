import express from "express";
import { setStudentFee, getStudentFee, createPayment, verifyPayment, getAllFees, getEnvNumbersByDepartment, getAllDepartments } from "../controllers/feeController.js";

const router = express.Router();

router.post("/set-fee", setStudentFee);
router.get("/student/:envNumber", getStudentFee);
router.post("/pay", createPayment);
router.post("/verify", verifyPayment);
router.get("/all", getAllFees);
router.get("/env-numbers/:department", getEnvNumbersByDepartment);
router.get("/departments", getAllDepartments); // New route

export default router;