import mongoose from "mongoose";

const FeeSchema = new mongoose.Schema({
  envNumber: { type: String, required: true },
  studentName: { type: String, required: true },
  route: { type: String, required: true },
  feeAmount: { type: Number, required: true },
  duration: { 
    type: String, 
    required: true, 
    enum: ['1month', '6months', '1year'] 
  },
  isPaid: { type: Boolean, default: false },
  paymentDate: { type: Date },
  transactionId: { type: String },
});

const Fee = mongoose.model("Fee", FeeSchema);
export default Fee;