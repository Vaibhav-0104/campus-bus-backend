import express from 'express';
import { getDrivers, addDriver, updateDriver, deleteDriver, loginDriver, getBusAttendance } from '../controllers/driverController.js';
import Driver from '../models/Driver.js';
import multer from 'multer'; // Added for file uploads

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store in uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, `driver-license-${Date.now()}-${file.originalname}`); // Unique filename
  }
});

// File filter for PDF only
const fileFilter = (req, file, cb) => {
  console.log('Uploaded file details:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
  });
  const isPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');
  const isValidMimeType = ['application/pdf', 'application/octet-stream'].includes(file.mimetype);

  if (isValidMimeType && isPdfExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Only PDF files are allowed, received: ${file.mimetype} with name ${file.originalname}`), false);
  }
};

const upload = multer({ storage, fileFilter });

const router = express.Router();

router.get('/drivers', getDrivers);
router.post('/drivers', upload.single('licenseDocument'), addDriver); // Added multer for PDF upload
router.put('/drivers/:id', upload.single('licenseDocument'), updateDriver); // Added multer for PDF upload
router.delete('/drivers/:id', deleteDriver);
router.post('/drivers/login', loginDriver);
router.get('/drivers/attendance', getBusAttendance);

export default router;