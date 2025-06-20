import express from 'express';
import { getDrivers, addDriver, updateDriver, deleteDriver, loginDriver, getBusAttendance } from '../controllers/driverController.js';
import Driver from '../models/Driver.js';

const router = express.Router();

router.get('/drivers', getDrivers);
router.post('/drivers', addDriver);
router.put('/drivers/:id', updateDriver);
router.delete('/drivers/:id', deleteDriver);
router.post('/drivers/login', loginDriver);
router.get('/drivers/attendance', getBusAttendance);


export default router;
