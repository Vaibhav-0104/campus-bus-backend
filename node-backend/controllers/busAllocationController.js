import mongoose from 'mongoose';
import BusAllocation from '../models/BusAllocation.js';
import Student from '../models/Student.js';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';

// Allocate bus to student
export const allocateBus = async (req, res) => {
    const { studentId, busId } = req.body;

    try {
        const student = await Student.findById(studentId);
        const bus = await Bus.findById(busId);

        if (!student) {
            console.log(`Student not found for ID: ${studentId}`);
            return res.status(404).json({ message: 'Student not found' });
        }
        if (!bus) {
            console.log(`Bus not found for ID: ${busId}`);
            return res.status(404).json({ message: 'Bus not found' });
        }

        let allocation = await BusAllocation.findOne({ studentId });

        if (allocation) {
            allocation.busId = busId;
            await allocation.save();
            console.log(`Updated bus allocation for student: ${studentId}, bus: ${busId}`);
        } else {
            allocation = new BusAllocation({ studentId, busId });
            await allocation.save();
            console.log(`Created new bus allocation for student: ${studentId}, bus: ${busId}`);
        }

        res.status(200).json({ message: 'Bus allocation updated successfully', allocation });
    } catch (error) {
        console.error('Error in allocateBus:', error.message, error.stack);
        res.status(500).json({ message: 'Error allocating bus', error: error.message });
    }
};

// Fetch all allocations with student and bus details
export const getAllAllocations = async (req, res) => {
    try {
        const { busNumber } = req.query;
        console.log(`Fetching allocations for busNumber: ${busNumber || 'all'}`);

        let query = {};

        if (busNumber) {
            const bus = await Bus.findOne({ busNumber });
            if (!bus) {
                console.log(`No bus found for busNumber: ${busNumber}`);
                return res.status(404).json({ message: `Bus with number ${busNumber} not found` });
            }
            query.busId = bus._id;
            console.log(`Found bus ID: ${bus._id} for busNumber: ${busNumber}`);
        }

        const allocations = await BusAllocation.find(query)
            .populate('studentId', 'envNumber name')
            .populate('busId', 'busNumber to');

        console.log(`Found ${allocations.length} allocations`);
        res.status(200).json(allocations);
    } catch (error) {
        console.error('Error in getAllAllocations:', error.message, error.stack);
        res.status(500).json({ message: 'Error fetching allocations', error: error.message });
    }
};

// Fetch student allocations for a specific driver's bus
export const getDriverAllocations = async (req, res) => {
    try {
        const { driverId } = req.params;
        console.log(`Fetching allocations for driverId: ${driverId}`);

        // Validate driverId
        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            console.log(`Invalid driverId: ${driverId}`);
            return res.status(400).json({ message: 'Invalid driver ID' });
        }

        const driver = await Driver.findById(driverId);
        if (!driver) {
            console.log(`No driver found for driverId: ${driverId}`);
            return res.status(404).json({ message: 'Driver not found' });
        }
        console.log(`Found driver: ${driver.name}`);

        // Use driverId to find the bus
        const bus = await Bus.findOne({ driverId: driverId, status: 'Active' });
        if (!bus) {
            console.log(`No active bus found for driverId: ${driverId}`);
            return res.status(404).json({ message: 'No active bus assigned to this driver' });
        }
        console.log(`Found bus: ${bus.busNumber}`);

        const allocations = await BusAllocation.find({ busId: bus._id })
            .populate('studentId', 'envNumber name email') // Match frontend expectations
            .populate('busId', 'busNumber to');
        console.log(`Found ${allocations.length} allocations for busId: ${bus._id}`);

        res.status(200).json(allocations);
    } catch (error) {
        console.error('Error in getDriverAllocations:', error.message, error.stack);
        res.status(500).json({ message: 'Error fetching driver allocations', error: error.message });
    }
};