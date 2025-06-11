import mongoose from "mongoose";

const FeeSchema = new mongoose.Schema({
  envNumber: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  route: { type: String, required: true },
  feeAmount: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  paymentDate: { type: Date },
  transactionId: { type: String },
});


const Fee = mongoose.model("Fee", FeeSchema);
export default Fee;
