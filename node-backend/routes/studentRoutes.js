// import express from "express";
// import multer from "multer";
// import { createStudent, getAllStudents, updateStudent, deleteStudent, loginStudent, getAttendancePercentageByDateRange, getAttendanceByDate, getRouteByEnv } from "../controllers/studentController.js";
// import { markAttendance } from "../controllers/studentController.js";
// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "../face-service/uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// router.post("/", upload.single("image"), createStudent);
// router.get("/", getAllStudents);
// router.put("/:id", upload.single("image"), updateStudent);
// router.delete("/:id", deleteStudent);
// router.post("/login", loginStudent);
// router.post("/attendance", upload.single("image"), markAttendance);
// router.post("/attendance/by-date", getAttendancePercentageByDateRange);
// router.post("/attendance/date", getAttendanceByDate);
// router.get('/route-by-env/:envNumber', getRouteByEnv);

// export default router;




// routes/studentRoutes.js
import express from "express";
import multer from "multer";
import {
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  loginStudent,
  getAttendancePercentageByDateRange,
  getAttendanceByDate,
  getRouteByEnv,
  loginParent // ✅ Import parent login
} from "../controllers/studentController.js";
import { markAttendance } from "../controllers/studentController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "../face-service/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("image"), createStudent);
router.get("/", getAllStudents);
router.put("/:id", upload.single("image"), updateStudent);
router.delete("/:id", deleteStudent);
router.post("/login", loginStudent);
router.post("/parent-login", loginParent); // ✅ Add parent login route
router.post("/attendance", upload.single("image"), markAttendance);
router.post("/attendance/by-date", getAttendancePercentageByDateRange);
router.post("/attendance/date", getAttendanceByDate);
router.get('/route-by-env/:envNumber', getRouteByEnv);

export default router;
