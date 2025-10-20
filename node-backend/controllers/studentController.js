import Student from "../models/Student.js";
import BusAllocation from "../models/BusAllocation.js";
import Bus from "../models/Bus.js";
import Attendance from "../models/Attendance.js";
import BusStatus from "../models/BusStatus.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import FormData from "form-data";

// ✅ Add Parent Login (Updated for multiple students)
export const loginParent = async (req, res) => {
  try {
    console.log('Received parent login request:', req.body);
    const { parentContact, parentEmail } = req.body;

    if (!parentContact || !parentEmail) {
      return res.status(400).json({ message: "Parent contact and email are required" });
    }

    const students = await Student.find({ parentContact, parentEmail });

    if (!students || students.length === 0) {
      console.log(`No students found for parentContact: ${parentContact}, parentEmail: ${parentEmail}`);
      return res.status(404).json({ message: "No students found for this parent contact and email" });
    }

    res.status(200).json({
      message: "Parent login successful",
      students: students.map(student => ({
        _id: student._id,
        envNumber: student.envNumber,
        name: student.name,
        department: student.department,
        parentContact: student.parentContact,
        parentEmail: student.parentEmail,
        imagePath: student.imagePath,
      })),
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// 🔄 Updated createStudent to include parentEmail
export const createStudent = async (req, res) => {
  try {
    const { envNumber, name, email, password, department, mobile, parentContact, parentEmail } = req.body;

    if (!envNumber || !name || !email || !password || !department || !mobile || !parentContact || !parentEmail) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `../face-service/uploads/${req.file.filename}` : "";

    const student = new Student({ envNumber, name, email, password: hashedPassword, department, mobile, parentContact, parentEmail, imagePath });
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

    console.log("Sending request to face recognition service");
    let response;
    const retryAxios = async (url, data, config, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await axios.post(url, data, config);
        } catch (error) {
          if ((error.code === 'ECONNREFUSED' || error.response?.status >= 500) && i < retries - 1) {
            console.warn(`Retry ${i + 1}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
    };

    try {
      response = await retryAxios("https://campus-bus-backend-python.onrender.com/verify-face", form, {
        headers: {
          ...form.getHeaders(),
          "Content-Length": formLength,
        },
      });
      console.log("Face recognition response:", response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error("Face recognition service is unavailable at http://localhost:5001");
        return res.status(503).json({ message: "Face recognition service is unavailable. Please try again later." });
      }
      console.error("Error from face recognition service:", error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        message: `Face recognition error: ${error.response?.data?.error || error.message}`,
      });
    }

    const { verified, studentImage } = response.data;

    if (!verified) {
      console.log("Face not recognized by service");
      return res.status(404).json({ message: "Face not recognized" });
    }

    const matchedStudent = await Student.findOne({ imagePath: `../face-service/uploads/${studentImage}` });
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

    console.log(`Attendance marked for student: ${matchedStudent.name}`);
    res.status(200).json({
      message: "Attendance marked successfully",
      student: matchedStudent.name,
      attendanceId: attendance._id,
    });
  } catch (err) {
    console.error("Error in markAttendance:", err.message, err.stack);
    res.status(500).json({ message: `Internal server error: ${err.message}` });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        console.log(`Cleaning up file: ${tempFilePath}`);
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.error(`Error cleaning up file ${tempFilePath}:`, cleanupErr.message);
      }
    }
  }
};

// 📌 Student: Get Attendance Percentage by Date Range
export const getAttendancePercentageByDateRange = async (req, res) => {
  try {
    const { envNumber, startDate, endDate } = req.body;

    if (!envNumber || !startDate || !endDate) {
      console.error("Validation Error: envNumber, startDate, and endDate are required for getAttendancePercentageByDateRange.");
      return res.status(400).json({ message: "envNumber, startDate, and endDate are required." });
    }

    const student = await Student.findOne({ envNumber });
    if (!student) {
      console.error(`Data Not Found: Student with envNumber ${envNumber} not found for attendance calculation.`);
      return res.status(404).json({ message: "Student not found." });
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Validation Error: Invalid date format provided for startDate or endDate.");
      return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD." });
    }

    const attendanceRecords = await Attendance.find({
      studentId: student._id,
      date: { $gte: start, $lte: end },
    }).select('date status -_id');

    if (attendanceRecords.length === 0) {
      console.log(`No attendance data found for envNumber ${envNumber} between ${startDate} and ${endDate}.`);
      return res.status(200).json({
        percentage: 0,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        dailyRecords: [],
        message: "No attendance data available for this period."
      });
    }

    let presentDays = 0;
    const uniqueDates = new Set();

    const dailyRecordsMap = {};
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      dailyRecordsMap[recordDate] = record.status;
    });

    Object.keys(dailyRecordsMap).forEach(dateStr => {
      if (dailyRecordsMap[dateStr] === "Present") {
        presentDays++;
      }
      uniqueDates.add(dateStr);
    });

    const totalDaysRecorded = uniqueDates.size;
    const attendancePercentage = totalDaysRecorded > 0 ? (presentDays / totalDaysRecorded) * 100 : 0;

    res.status(200).json({
      percentage: attendancePercentage.toFixed(2),
      totalDays: totalDaysRecorded,
      presentDays: presentDays,
      absentDays: totalDaysRecorded - presentDays,
      dailyRecords: attendanceRecords.map(record => ({
        date: record.date.toISOString().split('T')[0],
        status: record.status
      }))
    });
    console.log(`✅ Attendance calculated for envNumber ${envNumber}: ${attendancePercentage.toFixed(2)}%`);
  } catch (error) {
    console.error("Error in getAttendancePercentageByDateRange:", error);
    res.status(500).json({ message: 'Error fetching attendance percentage', error: error.message });
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

// 📌 Get Route by Env Number
export const getRouteByEnv = async (req, res) => {
  try {
    const { envNumber } = req.params;
    console.log(`Looking for student with envNumber: ${envNumber}`);
    const student = await Student.findOne({ envNumber });
    if (!student) {
      return res.status(404).json({ error: `Student not found for envNumber: ${envNumber}` });
    }

    const allocation = await BusAllocation.findOne({ studentId: student._id }).populate('busId', 'to');
    if (!allocation || !allocation.busId) {
      return res.status(404).json({ error: `No route assigned to student with envNumber: ${envNumber}` });
    }

    res.status(200).json({ route: allocation.busId.to });
  } catch (error) {
    console.error('Error in getRouteByEnv:', error.message);
    res.status(500).json({ error: 'Error fetching route' });
  }
};

// 📌 Get Bus Status by Env Number
export const getBusStatusByEnv = async (req, res) => {
  try {
    const { envNumber } = req.params;
    const student = await Student.findOne({ envNumber });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const allocation = await BusAllocation.findOne({ studentId: student._id });
    if (!allocation) {
      return res.status(404).json({ message: "No bus allocated to this student" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const busStatus = await BusStatus.findOne({
      studentId: student._id,
      busId: allocation.busId,
      date: { $gte: today, $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
    });

    res.status(200).json({
      status: busStatus ? busStatus.status : 'Not Yet Boarded',
    });
  } catch (error) {
    console.error('Error in getBusStatusByEnv:', error.message);
    res.status(500).json({ message: 'Error fetching bus status', error: error.message });
  }
};