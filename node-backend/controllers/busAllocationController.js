// import mongoose from 'mongoose';
// import BusAllocation from '../models/BusAllocation.js';
// import Student from '../models/Student.js';
// import Bus from '../models/Bus.js';
// import Driver from '../models/Driver.js';

// // Allocate bus to student
// export const allocateBus = async (req, res) => {
//     const { studentId, busId } = req.body;

//     try {
//         const student = await Student.findById(studentId);
//         const bus = await Bus.findById(busId);

//         if (!student) {
//             console.log(`Student not found for ID: ${studentId}`);
//             return res.status(404).json({ message: 'Student not found' });
//         }
//         if (!bus) {
//             console.log(`Bus not found for ID: ${busId}`);
//             return res.status(404).json({ message: 'Bus not found' });
//         }

//         let allocation = await BusAllocation.findOne({ studentId });

//         if (allocation) {
//             allocation.busId = busId;
//             await allocation.save();
//             console.log(`Updated bus allocation for student: ${studentId}, bus: ${busId}`);
//         } else {
//             allocation = new BusAllocation({ studentId, busId });
//             await allocation.save();
//             console.log(`Created new bus allocation for student: ${studentId}, bus: ${busId}`);
//         }

//         res.status(200).json({ message: 'Bus allocation updated successfully', allocation });
//     } catch (error) {
//         console.error('Error in allocateBus:', error.message, error.stack);
//         res.status(500).json({ message: 'Error allocating bus', error: error.message });
//     }
// };

// // Fetch all allocations with student and bus details
// export const getAllAllocations = async (req, res) => {
//     try {
//         const { busNumber } = req.query;
//         console.log(`Fetching allocations for busNumber: ${busNumber || 'all'}`);

//         let query = {};

//         if (busNumber) {
//             const bus = await Bus.findOne({ busNumber });
//             if (!bus) {
//                 console.log(`No bus found for busNumber: ${busNumber}`);
//                 return res.status(404).json({ message: `Bus with number ${busNumber} not found` });
//             }
//             query.busId = bus._id;
//             console.log(`Found bus ID: ${bus._id} for busNumber: ${busNumber}`);
//         }

//         const allocations = await BusAllocation.find(query)
//             .populate('studentId', 'envNumber name')
//             .populate('busId', 'busNumber to');

//         console.log(`Found ${allocations.length} allocations`);
//         res.status(200).json(allocations);
//     } catch (error) {
//         console.error('Error in getAllAllocations:', error.message, error.stack);
//         res.status(500).json({ message: 'Error fetching allocations', error: error.message });
//     }
// };

// // Fetch student allocations for a specific driver's bus
// export const getDriverAllocations = async (req, res) => {
//     try {
//         const { driverId } = req.params;
//         console.log(`Fetching allocations for driverId: ${driverId}`);

//         // Validate driverId
//         if (!mongoose.Types.ObjectId.isValid(driverId)) {
//             console.log(`Invalid driverId: ${driverId}`);
//             return res.status(400).json({ message: 'Invalid driver ID' });
//         }

//         const driver = await Driver.findById(driverId);
//         if (!driver) {
//             console.log(`No driver found for driverId: ${driverId}`);
//             return res.status(404).json({ message: 'Driver not found' });
//         }
//         console.log(`Found driver: ${driver.name}`);

//         // Use driverId to find the bus
//         const bus = await Bus.findOne({ driverId: driverId, status: 'Active' });
//         if (!bus) {
//             console.log(`No active bus found for driverId: ${driverId}`);
//             return res.status(404).json({ message: 'No active bus assigned to this driver' });
//         }
//         console.log(`Found bus: ${bus.busNumber}`);

//         const allocations = await BusAllocation.find({ busId: bus._id })
//             .populate('studentId', 'envNumber name email') // Match frontend expectations
//             .populate('busId', 'busNumber to');
//         console.log(`Found ${allocations.length} allocations for busId: ${bus._id}`);

//         res.status(200).json(allocations);
//     } catch (error) {
//         console.error('Error in getDriverAllocations:', error.message, error.stack);
//         res.status(500).json({ message: 'Error fetching driver allocations', error: error.message });
//     }
// };


import mongoose from 'mongoose';
import BusAllocation from '../models/BusAllocation.js';
import Student from '../models/Student.js';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';

// Allocate bus to student
export const allocateBus = async (req, res) => {
  const { studentId, busId, to } = req.body;

  try {
    // Validate input
    if (!studentId || !busId || !to) {
      console.log(`Missing required fields: studentId=${studentId}, busId=${busId}, to=${to}`);
      return res.status(400).json({ message: 'Student ID, Bus ID, and To destination are required' });
    }

    // Validate student and bus
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

    // Check if bus.to matches the provided to
    if (bus.to !== to) {
      console.log(`Bus destination mismatch: bus.to=${bus.to}, provided to=${to}`);
      return res.status(400).json({ message: `Bus destination (${bus.to}) does not match provided destination (${to})` });
    }

    // Check for existing allocation
    let allocation = await BusAllocation.findOne({ studentId });

    if (allocation) {
      // Update existing allocation
      allocation.busId = busId;
      allocation.to = to;
      await allocation.save();
      console.log(`Updated bus allocation for student: ${studentId}, bus: ${busId}, to: ${to}`);
      return res.status(200).json({ message: 'Bus allocation updated successfully', allocation });
    } else {
      // Create new allocation
      allocation = new BusAllocation({ studentId, busId, to });
      await allocation.save();
      console.log(`Created new bus allocation for student: ${studentId}, bus: ${busId}, to: ${to}`);
      return res.status(201).json({ message: 'Bus allocation created successfully', allocation });
    }
  } catch (error) {
    console.error('Error in allocateBus:', error.message, error.stack);
    res.status(500).json({ message: 'Error allocating bus', error: error.message });
  }
};

// Update bus allocation
export const updateAllocation = async (req, res) => {
  const { id } = req.params;
  const { studentId, busId, to } = req.body;

  try {
    // Validate input
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid allocation ID: ${id}`);
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }
    if (!studentId || !busId || !to) {
      console.log(`Missing required fields: studentId=${studentId}, busId=${busId}, to=${to}`);
      return res.status(400).json({ message: 'Student ID, Bus ID, and To destination are required' });
    }

    // Validate student and bus
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

    // Check if bus.to matches the provided to
    if (bus.to !== to) {
      console.log(`Bus destination mismatch: bus.to=${bus.to}, provided to=${to}`);
      return res.status(400).json({ message: `Bus destination (${bus.to}) does not match provided destination (${to})` });
    }

    // Find and update allocation
    const allocation = await BusAllocation.findById(id);
    if (!allocation) {
      console.log(`Allocation not found for ID: ${id}`);
      return res.status(404).json({ message: 'Allocation not found' });
    }

    allocation.studentId = studentId;
    allocation.busId = busId;
    allocation.to = to;
    await allocation.save();

    console.log(`Updated allocation ID: ${id}, student: ${studentId}, bus: ${busId}, to: ${to}`);
    res.status(200).json({ message: 'Bus allocation updated successfully', allocation });
  } catch (error) {
    console.error('Error in updateAllocation:', error.message, error.stack);
    res.status(500).json({ message: 'Error updating allocation', error: error.message });
  }
};

// Delete bus allocation
export const deleteAllocation = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid allocation ID: ${id}`);
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }

    // Find and delete allocation
    const allocation = await BusAllocation.findByIdAndDelete(id);
    if (!allocation) {
      console.log(`Allocation not found for ID: ${id}`);
      return res.status(404).json({ message: 'Allocation not found' });
    }

    console.log(`Deleted allocation ID: ${id}`);
    res.status(200).json({ message: 'Bus allocation deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAllocation:', error.message, error.stack);
    res.status(500).json({ message: 'Error deleting allocation', error: error.message });
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
      .populate('studentId', 'envNumber name email')
      .populate('busId', 'busNumber to');

    console.log(`Found ${allocations.length} allocations for busId: ${bus._id}`);
    res.status(200).json(allocations);
  } catch (error) {
    console.error('Error in getDriverAllocations:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching driver allocations', error: error.message });
  }
};