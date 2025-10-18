import Fee from "../models/Fee.js";
import Student from "../models/Student.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// 📌 1. Admin: Set Student Fees
export const setStudentFee = async (req, res) => {
  try {
    const { envNumber, feeAmount, route, duration } = req.body;

    if (!envNumber || !feeAmount || !route || !duration) {
      console.error("Validation Error: Missing envNumber, feeAmount, route, or duration in setStudentFee request.");
      return res.status(400).json({ error: "envNumber, feeAmount, route, and duration are required!" });
    }

    if (!["1month", "6months", "1year"].includes(duration)) {
      console.error(`Validation Error: Invalid duration ${duration}. Must be 1month, 6months, or 1year.`);
      return res.status(400).json({ error: "Invalid duration. Must be 1month, 6months, or 1year." });
    }

    const student = await Student.findOne({ envNumber });
    if (!student) {
      console.error(`Validation Error: Student with envNumber ${envNumber} not found.`);
      return res.status(404).json({ error: "Student not found" });
    }

    let fee = await Fee.findOne({ envNumber });

    if (fee) {
      fee.feeAmount = feeAmount;
      fee.route = route;
      fee.duration = duration;
      fee.isPaid = false; // Reset to unpaid on update
      fee.paymentDate = null; // Clear payment date
      fee.transactionId = null; // Clear transaction ID
      await fee.save();
      console.log(`✅ Fee updated successfully for envNumber: ${envNumber}`);
    } else {
      fee = new Fee({ envNumber, studentName: student.name, feeAmount, route, duration });
      await fee.save();
      console.log(`✅ New fee record created successfully for envNumber: ${envNumber}`);
    }

    res.status(200).json({ message: "Fee updated successfully", fee });
    
  } catch (error) {
    console.error("Error in setStudentFee:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 2. Student: Get Fee Details
export const getStudentFee = async (req, res) => {
  try {
    const { envNumber } = req.params;

    if (!envNumber) {
      console.error("Validation Error: envNumber is required in getStudentFee request.");
      return res.status(400).json({ error: "envNumber is required!" });
    }

    const fee = await Fee.findOne({ envNumber });

    if (!fee) {
      console.error(`Data Not Found: Fee record for envNumber ${envNumber} not found.`);
      return res.status(404).json({ error: "Fee not found" });
    }

    res.status(200).json(fee);
  } catch (error) {
    console.error("Error in getStudentFee:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 3. Student: Start Razorpay Payment
export const createPayment = async (req, res) => {
  try {
    const { envNumber, duration } = req.body;
    
    if (!envNumber || !duration) {
      console.error("Validation Error: envNumber and duration are required for createPayment.");
      return res.status(400).json({ error: "envNumber and duration are required!" });
    }

    const fee = await Fee.findOne({ envNumber, duration });

    if (!fee) {
      console.error(`Payment Request Error: Fee record not found for envNumber ${envNumber}, duration ${duration}.`);
      return res.status(404).json({ error: "Fee not found for this enrollment number and duration." });
    }
    
    if (fee.isPaid) {
      console.warn(`Payment Request Warning: Fee for envNumber ${envNumber}, duration ${duration} is already paid.`);
      return res.status(400).json({ error: "Fee for this enrollment number and duration is already paid." });
    }

    const options = {
      amount: fee.feeAmount * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: `receipt_${envNumber}_${duration}`,
      payment_capture: 1, // Auto-capture the payment
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY,
    });

    console.log("✅ Razorpay Order Created:", order.id, "for envNumber:", envNumber, "duration:", duration);
  } catch (error) {
    console.error("Error in createPayment:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 4. Verify Payment & Update Status
export const verifyPayment = async (req, res) => {
  try {
    const { envNumber, duration, paymentId, orderId, signature } = req.body;

    if (!envNumber || !duration || !paymentId || !orderId || !signature) {
      console.error("Verification Error: Missing required fields in verifyPayment request body.", { envNumber, duration, paymentId, orderId, signature });
      return res.status(400).json({ error: "Missing required payment verification details." });
    }

    const fee = await Fee.findOne({ envNumber, duration });

    if (!fee) {
      console.error(`Verification Error: Student fee record not found for envNumber: ${envNumber}, duration: ${duration}.`);
      return res.status(404).json({ error: "Student fee record not found for verification." });
    }

    if (!process.env.RAZORPAY_SECRET) {
      console.error("Configuration Error: RAZORPAY_SECRET is not set in environment variables. Cannot verify payment.");
      return res.status(500).json({ error: "Server configuration error during payment verification." });
    }

    const body = orderId + "|" + paymentId;
    let expectedSignature;
    try {
        expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest("hex");
    } catch (hashError) {
        console.error("Verification Error: Failed to generate expected signature.", { body, error: hashError.message });
        return res.status(500).json({ error: "Internal server error during signature generation." });
    }

    if (expectedSignature !== signature) {
      console.error(`Verification Failed: Mismatched signature. Received: ${signature}, Expected: ${expectedSignature}. For orderId: ${orderId}, paymentId: ${paymentId}`);
      return res.status(400).json({ error: "Payment Verification Failed: Signature mismatch!" });
    }

    if (fee.isPaid) {
        console.warn(`Verification Warning: Fee for envNumber ${envNumber}, duration ${duration} (orderId: ${orderId}) is already marked as paid.`);
        return res.status(200).json({ message: "Payment already verified and status updated.", fee });
    }

    fee.isPaid = true;
    fee.paymentDate = new Date();
    fee.transactionId = paymentId;
    await fee.save();
    console.log(`✅ Payment successful and fee status updated for envNumber: ${envNumber}, duration: ${duration}, Transaction ID: ${paymentId}`);

    res.status(200).json({ message: "Payment successful", fee });
  } catch (error) {
    console.error("Unhandled Error in verifyPayment:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during payment verification." });
  }
};

// 📌 5. Admin: Get All Fee Records
export const getAllFees = async (req, res) => {
  try {
    const fees = await Fee.find();
    res.status(200).json(fees);
  } catch (error) {
    console.error("Error in getAllFees:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 6. Admin: Get Enrollment Numbers by Department
export const getEnvNumbersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      console.error("Validation Error: Department is required in getEnvNumbersByDepartment request.");
      return res.status(400).json({ error: "Department is required!" });
    }

    const students = await Student.find({ department }, { envNumber: 1 });
    
    if (!students || students.length === 0) {
      console.error(`Data Not Found: No students found for department ${department}.`);
      return res.status(404).json({ error: "No students found for this department." });
    }

    const envNumbers = students.map(student => student.envNumber);
    res.status(200).json({ envNumbers });
    console.log(`✅ Fetched ${envNumbers.length} enrollment numbers for department: ${department}`);
  } catch (error) {
    console.error("Error in getEnvNumbersByDepartment:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 7. Admin: Get All Departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Student.distinct("department");
    
    if (!departments || departments.length === 0) {
      console.error("Data Not Found: No departments found in Student collection.");
      return res.status(404).json({ error: "No departments found." });
    }

    res.status(200).json({ departments });
    console.log(`✅ Fetched ${departments.length} unique departments`);
  } catch (error) {
    console.error("Error in getAllDepartments:", error);
    res.status(500).json({ error: error.message });
  }
};

