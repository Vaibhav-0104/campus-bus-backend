import Fee from "../models/Fee.js";
import Student from "../models/Student.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// 📌 1. Admin: Set Student Fees
export const setStudentFee = async (req, res) => {
  try {
    const { envNumber, feeAmount, route } = req.body;

    if (!envNumber || !feeAmount || !route) {
      console.error("Validation Error: Missing envNumber, feeAmount, or route in setStudentFee request.");
      return res.status(400).json({ error: "envNumber, feeAmount, and route are required!" });
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
      await fee.save();
      console.log(`✅ Fee updated successfully for envNumber: ${envNumber}`);
    } else {
      fee = new Fee({ envNumber, studentName: student.name, feeAmount, route });
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
    const { envNumber } = req.body;
    
    if (!envNumber) {
      console.error("Validation Error: envNumber is required for createPayment.");
      return res.status(400).json({ error: "envNumber is required!" });
    }

    const fee = await Fee.findOne({ envNumber });

    if (!fee) {
      console.error(`Payment Request Error: Fee record not found for envNumber ${envNumber}.`);
      return res.status(404).json({ error: "Fee not found for this enrollment number." });
    }
    
    if (fee.isPaid) {
      console.warn(`Payment Request Warning: Fee for envNumber ${envNumber} is already paid.`);
      return res.status(400).json({ error: "Fee for this enrollment number is already paid." });
    }

    const options = {
      amount: fee.feeAmount * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: `receipt_${envNumber}`,
      payment_capture: 1, // Auto-capture the payment
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY, // Ensure this is correctly set in .env
    });

    console.log("✅ Razorpay Order Created:", order.id, "for envNumber:", envNumber);
  } catch (error) {
    console.error("Error in createPayment:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 4. Verify Payment & Update Status
export const verifyPayment = async (req, res) => {
  try {
    const { envNumber, paymentId, orderId, signature } = req.body;

    // --- Strict Input Validation ---
    if (!envNumber || !paymentId || !orderId || !signature) {
      console.error("Verification Error: Missing required fields in verifyPayment request body.", { envNumber, paymentId, orderId, signature });
      return res.status(400).json({ error: "Missing required payment verification details." });
    }

    const fee = await Fee.findOne({ envNumber });

    if (!fee) {
      console.error(`Verification Error: Student fee record not found for envNumber: ${envNumber}.`);
      return res.status(404).json({ error: "Student fee record not found for verification." });
    }

    // --- Check if Razorpay Secret is loaded ---
    if (!process.env.RAZORPAY_SECRET) {
      console.error("Configuration Error: RAZORPAY_SECRET is not set in environment variables. Cannot verify payment.");
      // This is a critical server-side error, avoid exposing exact details to client
      return res.status(500).json({ error: "Server configuration error during payment verification." });
    }

    // --- Verify Payment Signature using Crypto ---
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

    // --- Check if already paid to prevent double updates ---
    if (fee.isPaid) {
        console.warn(`Verification Warning: Fee for envNumber ${envNumber} (orderId: ${orderId}) is already marked as paid.`);
        return res.status(200).json({ message: "Payment already verified and status updated.", fee });
    }

    // --- Update Fee Status in Database ---
    fee.isPaid = true;
    fee.paymentDate = new Date();
    fee.transactionId = paymentId;
    await fee.save();
    console.log(`✅ Payment successful and fee status updated for envNumber: ${envNumber}, Transaction ID: ${paymentId}`);

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



