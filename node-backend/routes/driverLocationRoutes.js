import express from 'express';
import { startLocationSharing, stopLocationSharing, updateLocation, getLocationSharingStatus } from '../controllers/driverLocationController.js';

const router = express.Router();

router.post('/start-sharing', startLocationSharing);
router.post('/stop-sharing', stopLocationSharing);
router.post('/update-location', updateLocation);
router.get('/status', getLocationSharingStatus); // New route for status

export default router;