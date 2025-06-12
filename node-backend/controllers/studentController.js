import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import FormData from "form-data";

export const createStudent = async (req, res) => {
  try {
    const { envNumber, name, email, password, department, mobile, parentContact } = req.body;

    if (!envNumber || !name || !email || !password || !department || !mobile || !parentContact) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `../face-service/uploads/${req.file.filename}` : "";

    const student = new Student({ envNumber, name, email, password: hashedPassword, department, mobile, parentContact, imagePath });
    await student.save();
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

export const markAttendance = async (req, res) => {
  let tempFilePath = null;

  const waitUntilFaceServiceIsReady = async (url, retries = 6, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await axios.get(url, { timeout: 5000 });
        if (res.status === 200 || res.status === 404) {
          console.log("✅ face-service is ready");
          return;
        }
      } catch (e) {
        console.warn(`🕒 Waiting for face-service... retry ${i + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("❌ face-service did not start in time");
  };

  try {
    if (!req.file) {
      console.error("No file received in request");
      return res.status(400).json({ message: "Image is required" });
    }

    tempFilePath = req.file.path;
    console.log(`📸 Processing file: ${tempFilePath}, size: ${req.file.size} bytes`);

    if (!fs.existsSync(tempFilePath)) {
      return res.status(400).json({ message: "Uploaded file is missing or inaccessible" });
    }

    const fileContent = fs.readFileSync(tempFilePath);
    if (fileContent.length === 0) {
      return res.status(400).json({ message: "Uploaded file is empty" });
    }

    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath), {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    const formLength = await new Promise((resolve, reject) => {
      form.getLength((err, length) => (err ? reject(err) : resolve(length)));
    });

    const FACE_SERVICE_URL = "https://face-service-j883.onrender.com/../face-service/verify-face";

    console.log("⏳ Checking if face-service is ready...");
    await waitUntilFaceServiceIsReady("https://face-service-j883.onrender.com/", 12, 5000); // 12 retries × 5s = 60s


    console.log("🚀 Sending image to face-service...");
    const response = await axios.post(FACE_SERVICE_URL, form, {
      headers: {
        ...form.getHeaders(),
        "Content-Length": formLength,
      },
      timeout: 30000,
    });

    const { verified, studentImage } = response.data;

    if (!verified) {
      console.log("🙅 Face not recognized");
      return res.status(404).json({ message: "Face not recognized" });
    }

    const matchedStudent = await Student.findOne({
      imagePath: `../face-service/uploads/${studentImage}`,
    });

    if (!matchedStudent) {
      return res.status(404).json({ message: "Student not found for the matched image" });
    }

    const today = new Date();
    const attendanceExists = await Attendance.findOne({
      studentId: matchedStudent._id,
      date: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });

    if (attendanceExists) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    const attendance = await Attendance.create({
      studentId: matchedStudent._id,
      date: new Date(),
      status: "Present",
    });

    console.log(`✅ Attendance marked for student: ${matchedStudent.name}`);
    res.status(200).json({
      message: "Attendance marked successfully",
      student: matchedStudent.name,
      attendanceId: attendance._id,
    });
  } catch (err) {
    console.error("❌ Error in markAttendance:", err.message, err.stack);
    res.status(500).json({ message: `Internal server error: ${err.message}` });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🧹 Cleaned up: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.error(`Error cleaning up file ${tempFilePath}:`, cleanupErr.message);
      }
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