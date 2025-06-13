import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import FormData from "form-data";

// ✅ Create student and send image to face-service
export const createStudent = async (req, res) => {
  try {
    const { envNumber, name, email, password, department, mobile, parentContact } = req.body;
    if (!envNumber || !name || !email || !password || !department || !mobile || !parentContact)
      return res.status(400).json({ message: "All fields are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `../face-service/uploads/${req.file.filename}` : "";

    const student = new Student({ envNumber, name, email, password: hashedPassword, department, mobile, parentContact, imagePath });
    await student.save();

    // ✅ Send student image to face-service
    if (req.file) {
      const form = new FormData();
      form.append("image", fs.createReadStream(req.file.path), {
        filename: req.file.filename,
        contentType: req.file.mimetype,
      });

      try {
        await axios.post("https://face-service-j883.onrender.com/save-student-image", form, {
          headers: form.getHeaders(),
          timeout: 15000,
        });
        console.log("✅ Synced image to face-service");
      } catch (err) {
        console.error("❌ Failed to sync image to face-service:", err.message);
      }
    }

    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let updatedImagePath = student.imagePath;

    if (req.file) {
      if (student.imagePath) {
        const oldImagePath = path.join(path.resolve(), student.imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updatedImagePath = `../face-service/uploads/${req.file.filename}`;
    }

    const updatedData = {
      ...req.body,
      imagePath: updatedImagePath,
    };

    const updatedStudent = await Student.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.imagePath) {
      const imagePath = path.join(path.resolve(), student.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Student.findByIdAndDelete(id);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Login successful",
      student: {
        envNumber: student.envNumber,
        name: student.name,
        email: student.email,
        department: student.department,
        imagePath: student.imagePath,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Mark attendance with retries
// export const markAttendance = async (req, res) => {
//   const tempFilePath = req.file?.path;
//   try {
//     if (!req.file) return res.status(400).json({ message: "Image is required" });
//     if (!fs.existsSync(tempFilePath)) return res.status(400).json({ message: "File not found" });

//     const form = new FormData();
//     form.append("image", fs.createReadStream(tempFilePath), {
//       filename: req.file.originalname || "image.jpg",
//       contentType: req.file.mimetype || "image/jpeg",
//     });

//     // ✅ Check if face-service is awake
//     try {
//       await axios.get("https://face-service-j883.onrender.com/", { timeout: 5000 });
//     } catch (err) {
//       console.warn("⚠️ Face-service may still be waking up...");
//     }

//     await new Promise(resolve => setTimeout(resolve, 3000)); // Allow warm-up

//     // ✅ Retry request to /verify-face
//     let response;
//     for (let i = 0; i < 3; i++) {
//       try {
//         response = await axios.post("https://face-service-j883.onrender.com/verify-face", form, {
//           headers: form.getHeaders(),
//           timeout: 60000,
//         });
//         break;
//       } catch (err) {
//         if (i === 2) throw err;
//         console.warn(`Retry ${i + 1}/3 for face-service`);
//         await new Promise(res => setTimeout(res, 3000));
//       }
//     }

//     const { verified, studentImage } = response.data;
//     if (!verified) return res.status(404).json({ message: "Face not recognized" });

//     const matchedStudent = await Student.findOne({
//       imagePath: `../face-service/uploads/${studentImage}`,
//     });
//     if (!matchedStudent) return res.status(404).json({ message: "Matched student not found" });

//     const today = new Date();
//     const alreadyMarked = await Attendance.findOne({
//       studentId: matchedStudent._id,
//       date: { $gte: new Date(today.setHours(0, 0, 0, 0)), $lt: new Date(today.setHours(23, 59, 59, 999)) },
//     });

//     if (alreadyMarked)
//       return res.status(400).json({ message: "Attendance already marked today" });

//     const attendance = await Attendance.create({
//       studentId: matchedStudent._id,
//       date: new Date(),
//       status: "Present",
//     });

//     res.status(200).json({
//       message: "Attendance marked successfully",
//       student: matchedStudent.name,
//       attendanceId: attendance._id,
//     });
//   } catch (error) {
//     console.error("❌ markAttendance error:", error.message);
//     res.status(500).json({ message: `Face recognition error: ${error.message}` });
//   } finally {
//     if (tempFilePath && fs.existsSync(tempFilePath)) {
//       fs.unlinkSync(tempFilePath);
//       console.log("🧹 Temp file cleaned up");
//     }
//   }
// };




export const markAttendance = async (req, res) => {
  const tempFilePath = req.file?.path;

  try {
    // 🔍 1. Validate file
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    if (!fs.existsSync(tempFilePath)) return res.status(400).json({ message: "File not found" });

    // 📦 2. Prepare form
    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath), {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    // 🔄 3. Wake face-service
    const faceServiceURL = "https://face-service-j883.onrender.com/verify-face";

    console.log("⏳ Pinging face-service...");
    try {
      await axios.get("https://face-service-j883.onrender.com/", { timeout: 5000 });
    } catch (err) {
      console.warn("⚠️ face-service may still be waking up...");
    }

    await new Promise((resolve) => setTimeout(resolve, 4000)); // 💤 warm-up delay

    // 🔁 4. Retry axios POST with timeout
    let response;
    for (let i = 0; i < 3; i++) {
      try {
        response = await axios.post(faceServiceURL, form, {
          headers: {
            ...form.getHeaders(),
            "Content-Length": await new Promise((resolve, reject) => {
              form.getLength((err, length) => (err ? reject(err) : resolve(length)));
            }),
          },
          timeout: 60000, // ⏱️ long timeout
        });
        break;
      } catch (err) {
        console.warn(`Retry ${i + 1}/3 for face-service`);
        if (i === 2) throw err;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    const { verified, studentImage } = response.data;
    if (!verified) return res.status(404).json({ message: "Face not recognized" });

    // 🎓 5. Find student
    const matchedStudent = await Student.findOne({
      imagePath: `../face-service/uploads/${studentImage}`,
    });

    if (!matchedStudent)
      return res.status(404).json({ message: "Matched student not found" });

    // 📅 6. Check if already marked
    const today = new Date();
    const alreadyMarked = await Attendance.findOne({
      studentId: matchedStudent._id,
      date: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });

    if (alreadyMarked)
      return res.status(400).json({ message: "Attendance already marked today" });

    // 📝 7. Save attendance
    const attendance = await Attendance.create({
      studentId: matchedStudent._id,
      date: new Date(),
      status: "Present",
    });

    res.status(200).json({
      message: "Attendance marked successfully",
      student: matchedStudent.name,
      attendanceId: attendance._id,
    });
  } catch (err) {
    console.error("❌ markAttendance error:", err.message);
    res.status(500).json({ message: `Face recognition error: ${err.message}` });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("🧹 Temp file cleaned up");
    }
  }
};
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date, studentIds } = req.body;

    if (!date || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: "Date and student IDs are required" });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate },
    }).populate('studentId', 'name');

    const students = await Student.find({ _id: { $in: studentIds } }, 'name');
    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.studentId._id.toString(), record.status])
    );

    const result = students.map((student) => ({
      studentId: {
        _id: student._id,
        name: student.name,
      },
      status: attendanceMap.get(student._id.toString()) || 'Absent',
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};