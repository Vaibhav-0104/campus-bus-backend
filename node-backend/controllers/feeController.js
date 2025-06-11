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
      return res.status(400).json({ error: "envNumber, feeAmount, and route are required!" });
    }

    const student = await Student.findOne({ envNumber });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    let fee = await Fee.findOne({ envNumber });

    if (fee) {
      fee.feeAmount = feeAmount;
      fee.route = route;
      await fee.save();
    } else {
      fee = new Fee({ envNumber, studentName: student.name, feeAmount, route });
      await fee.save();
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
      return res.status(400).json({ error: "envNumber is required!" });
    }

    const fee = await Fee.findOne({ envNumber });

    if (!fee) return res.status(404).json({ error: "Fee not found" });

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
    const fee = await Fee.findOne({ envNumber });

    if (!fee || fee.isPaid) {
      return res.status(400).json({ error: "Invalid payment request or fee already paid" });
    }

    const options = {
      amount: fee.feeAmount * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: `receipt_${envNumber}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY,
    });

    console.log("✅ Order Created:", order);
  } catch (error) {
    console.error("Error in createPayment:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📌 4. Verify Payment & Update Status
export const verifyPayment = async (req, res) => {
  try {
    const { envNumber, paymentId, orderId, signature } = req.body;
    const fee = await Fee.findOne({ envNumber });

    if (!fee) {
      return res.status(404).json({ error: "Student fee not found" });
    }

    // ✅ Verify Payment Signature using Crypto
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Payment Verification Failed!" });
    }

    // ✅ Update Fee Status
    fee.isPaid = true;
    fee.paymentDate = new Date();
    fee.transactionId = paymentId;
    await fee.save();

    res.status(200).json({ message: "Payment successful", fee });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    res.status(500).json({ error: error.message });
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
