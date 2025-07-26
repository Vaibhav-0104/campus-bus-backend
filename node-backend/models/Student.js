// import mongoose from "mongoose";

// const studentSchema = new mongoose.Schema(
//   {
//     envNumber: { type: String, required: true, unique: true },
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true }, // Stored as hashed
//     department: { type: String, required: true },
//     mobile: { type: String, required: true },
//     parentContact: { type: String, required: true },
//     imagePath: { type: String, default: "" }, // Stores image path
//   },
//   { timestamps: true }
// );

// const Student = mongoose.model("Student", studentSchema);

// export default Student;




// models/Student.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    envNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    mobile: { type: String, required: true },
    parentContact: { type: String, required: true },
    parentEmail: { type: String, required: true }, // ✅ New field
    imagePath: { type: String, default: "" },
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);

export default Student;

