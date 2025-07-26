// 

import express from 'express';
import { allocateBus, getAllAllocations, getDriverAllocations, updateAllocation, deleteAllocation } from '../controllers/busAllocationController.js';

const router = express.Router();

// Route to allocate a bus to a student
router.post('/allocate', allocateBus);

// Route to update a bus allocation
router.put('/:id', updateAllocation);

// Route to delete a bus allocation
router.delete('/:id', deleteAllocation);

// Route to get all bus-student allocations
router.get('/allocations', getAllAllocations);

// Route to get student allocations for a specific driver's bus
router.get('/allocations/driver/:driverId', getDriverAllocations);

export default router; 