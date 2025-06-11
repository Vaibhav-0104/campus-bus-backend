import express from 'express';
import { allocateBus, getAllAllocations, getDriverAllocations } from '../controllers/busAllocationController.js';

const router = express.Router();

// Route to allocate a bus to a student
router.post('/allocate', allocateBus);

// Route to get all bus-student allocations
router.get('/allocations', getAllAllocations);

// Route to get student allocations for a specific driver's bus
router.get('/allocations/driver/:driverId', getDriverAllocations);

export default router;
