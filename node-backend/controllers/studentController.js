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

  try {
    if (!req.file) {
      console.error("No file received in request");
      return res.status(400).json({ message: "Image is required" });
    }

    tempFilePath = req.file.path;
    console.log(`Processing file: ${tempFilePath}, size: ${req.file.size} bytes`);

    if (!fs.existsSync(tempFilePath)) {
      console.error(`File not found at: ${tempFilePath}`);
      return res.status(400).json({ message: "Uploaded file is missing or inaccessible" });
    }

    const fileContent = fs.readFileSync(tempFilePath);
    if (fileContent.length === 0) {
      console.error(`File is empty: ${tempFilePath}`);
      return res.status(400).json({ message: "Uploaded file is empty" });
    }

    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath), {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    const formLength = await new Promise((resolve, reject) => {
      form.getLength((err, length) => {
        if (err) reject(err);
        resolve(length);
      });
    });
    console.log(`FormData size: ${formLength} bytes`);

    // ✅ Wake up the Render face-service before sending actual request
    console.log("⏳ Pinging face-service to wake it up...");
    try {
      await axios.get("https://face-service-j883.onrender.com/", { timeout: 5000 });
      console.log("✅ Face-service responded to ping");
    } catch (err) {
      console.warn("⚠️ Face-service may still be waking up...");
    }

    // ✅ Delay to allow full startup
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ✅ Retry logic for DeepFace POST
    const retryAxios = async (url, data, config, retries = 3, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await axios.post(url, data, config);
        } catch (error) {
          const shouldRetry =
            error.code === "ECONNREFUSED" ||
            error.code === "ECONNABORTED" ||
            error.code === "ETIMEDOUT" ||
            error.response?.status >= 500;

          if (shouldRetry && i < retries - 1) {
            console.warn(`Retry ${i + 1}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    };

    const FACE_SERVICE_URL = "https://face-service-j883.onrender.com/verify-face";
    let response;

    try {
      response = await retryAxios(FACE_SERVICE_URL, form, {
        headers: {
          ...form.getHeaders(),
          "Content-Length": formLength,
        },
        timeout: 30000, // ⏰ Render can take up to 30s on cold start
      });

      console.log("Face recognition response:", response.data);
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Face recognition service error";

      console.error("❌ Error from face recognition service:", errorMsg);
      return res.status(statusCode).json({ message: `Face recognition error: ${errorMsg}` });
    }

    const { verified, studentImage } = response.data;

    if (!verified) {
      console.log("Face not recognized by service");
      return res.status(404).json({ message: "Face not recognized" });
    }

    const matchedStudent = await Student.findOne({
      imagePath: `../face-service/uploads/${studentImage}`,
    });

    if (!matchedStudent) {
      console.log(`No student found for image: ${studentImage}`);
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
      console.log(`Attendance already marked for student: ${matchedStudent.name}`);
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
        console.log(`🧹 Cleaning up file: ${tempFilePath}`);
        fs.unlinkSync(tempFilePath);
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