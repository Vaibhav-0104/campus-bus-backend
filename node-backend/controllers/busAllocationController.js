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
  const { studentId, busId, to, seatNumber } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!studentId || !busId || !to || !seatNumber) {
      console.log(`Missing required fields: studentId=${studentId}, busId=${busId}, to=${to}, seatNumber=${seatNumber}`);
      return res.status(400).json({ message: 'Student ID, Bus ID, To destination, and Seat Number are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(busId)) {
      console.log(`Invalid ID: studentId=${studentId}, busId=${busId}`);
      return res.status(400).json({ message: 'Invalid Student ID or Bus ID' });
    }

    const student = await Student.findById(studentId).session(session);
    const bus = await Bus.findById(busId).session(session);

    if (!student) {
      console.log(`Student not found for ID: ${studentId}`);
      return res.status(404).json({ message: 'Student not found' });
    }
    if (!bus) {
      console.log(`Bus not found for ID: ${busId}`);
      return res.status(404).json({ message: 'Bus not found' });
    }

    if (bus.to !== to) {
      console.log(`Bus destination mismatch: bus.to=${bus.to}, provided to=${to}`);
      return res.status(400).json({ message: `Bus destination (${bus.to}) does not match provided destination (${to})` });
    }

    if (parseInt(seatNumber) < 1 || parseInt(seatNumber) > bus.capacity) {
      console.log(`Invalid seat number: ${seatNumber}, capacity: ${bus.capacity}`);
      return res.status(400).json({ message: `Seat number must be between 1 and ${bus.capacity}` });
    }

    // Check for existing allocation of the same seat on the same bus
    const existingSeatAllocation = await BusAllocation.findOne({ busId, seatNumber }).session(session);
    if (existingSeatAllocation) {
      console.log(`Seat ${seatNumber} already allocated on bus ${busId} to student ${existingSeatAllocation.studentId}`);
      await session.abortTransaction();
      return res.status(400).json({ message: `Seat ${seatNumber} is already allocated to another student` });
    }

    // Check if the student already has an allocation on any bus
    let allocation = await BusAllocation.findOne({ studentId }).session(session);

    if (allocation) {
      // If updating, ensure the seat is not taken by another student
      if (allocation.busId.toString() === busId.toString() && allocation.seatNumber === seatNumber) {
        // Same allocation, no update needed
        await session.abortTransaction();
        return res.status(200).json({ message: 'No changes made to allocation', allocation });
      }

      // Clear old allocation
      const oldBus = await Bus.findById(allocation.busId).session(session);
      if (oldBus) {
        oldBus.allocatedSeats = Array.isArray(oldBus.allocatedSeats) ? oldBus.allocatedSeats : [];
        oldBus.allocatedSeats = oldBus.allocatedSeats.filter(seat => seat !== allocation.seatNumber);
        await oldBus.save({ session });
      }

      allocation.busId = busId;
      allocation.to = to;
      allocation.seatNumber = seatNumber;
      await allocation.save({ session });
      console.log(`Updated bus allocation for student: ${studentId}, bus: ${busId}, to: ${to}, seat: ${seatNumber}`);
    } else {
      allocation = new BusAllocation({ studentId, busId, to, seatNumber });
      await allocation.save({ session });
      console.log(`Created new bus allocation for student: ${studentId}, bus: ${busId}, to: ${to}, seat: ${seatNumber}`);
    }

    // Update bus's allocated seats
    bus.allocatedSeats = Array.isArray(bus.allocatedSeats) ? bus.allocatedSeats : [];
    bus.allocatedSeats.push(seatNumber);
    await bus.save({ session });

    await session.commitTransaction();

    const populatedAllocation = await BusAllocation.findById(allocation._id)
      .populate('studentId', 'envNumber name')
      .populate('busId', 'busNumber to');
    res.status(allocation.isNew ? 201 : 200).json({ 
      message: `Bus allocation ${allocation.isNew ? 'created' : 'updated'} successfully`, 
      allocation: populatedAllocation 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in allocateBus:', error.message, error.stack);
    res.status(500).json({ message: 'Error allocating bus', error: error.message });
  } finally {
    session.endSession();
  }
};

// Update bus allocation
export const updateAllocation = async (req, res) => {
  const { id } = req.params;
  const { studentId, busId, to, seatNumber } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid allocation ID: ${id}`);
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }
    if (!studentId || !busId || !to || !seatNumber) {
      console.log(`Missing required fields: studentId=${studentId}, busId=${busId}, to=${to}, seatNumber=${seatNumber}`);
      return res.status(400).json({ message: 'Student ID, Bus ID, To destination, and Seat Number are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(busId)) {
      console.log(`Invalid ID: studentId=${studentId}, busId=${busId}`);
      return res.status(400).json({ message: 'Invalid Student ID or Bus ID' });
    }

    const student = await Student.findById(studentId).session(session);
    const bus = await Bus.findById(busId).session(session);

    if (!student) {
      console.log(`Student not found for ID: ${studentId}`);
      return res.status(404).json({ message: 'Student not found' });
    }
    if (!bus) {
      console.log(`Bus not found for ID: ${busId}`);
      return res.status(404).json({ message: 'Bus not found' });
    }

    if (bus.to !== to) {
      console.log(`Bus destination mismatch: bus.to=${bus.to}, provided to=${to}`);
      return res.status(400).json({ message: `Bus destination (${bus.to}) does not match provided destination (${to})` });
    }

    if (parseInt(seatNumber) < 1 || parseInt(seatNumber) > bus.capacity) {
      console.log(`Invalid seat number: ${seatNumber}, capacity: ${bus.capacity}`);
      return res.status(400).json({ message: `Seat number must be between 1 and ${bus.capacity}` });
    }

    const allocation = await BusAllocation.findById(id).session(session);
    if (!allocation) {
      console.log(`Allocation not found for ID: ${id}`);
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Check if the seat is allocated to another student on the same bus
    const existingSeatAllocation = await BusAllocation.findOne({ 
      busId, 
      seatNumber, 
      _id: { $ne: id } // Exclude the current allocation
    }).session(session);
    if (existingSeatAllocation) {
      console.log(`Seat ${seatNumber} already allocated on bus ${busId} to student ${existingSeatAllocation.studentId}`);
      await session.abortTransaction();
      return res.status(400).json({ message: `Seat ${seatNumber} is already allocated to another student` });
    }

    const oldBusId = allocation.busId;
    const oldSeatNumber = allocation.seatNumber;

    if (oldBusId.toString() !== busId.toString()) {
      const oldBus = await Bus.findById(oldBusId).session(session);
      if (oldBus) {
        oldBus.allocatedSeats = Array.isArray(oldBus.allocatedSeats) ? oldBus.allocatedSeats : [];
        oldBus.allocatedSeats = oldBus.allocatedSeats.filter(seat => seat !== oldSeatNumber);
        await oldBus.save({ session });
      }
    } else if (seatNumber !== oldSeatNumber) {
      bus.allocatedSeats = Array.isArray(bus.allocatedSeats) ? bus.allocatedSeats : [];
      bus.allocatedSeats = bus.allocatedSeats.filter(seat => seat !== oldSeatNumber);
    }

    bus.allocatedSeats = Array.isArray(bus.allocatedSeats) ? bus.allocatedSeats : [];
    bus.allocatedSeats.push(seatNumber);
    await bus.save({ session });

    allocation.studentId = studentId;
    allocation.busId = busId;
    allocation.to = to;
    allocation.seatNumber = seatNumber;
    await allocation.save({ session });

    await session.commitTransaction();

    const populatedAllocation = await BusAllocation.findById(id)
      .populate('studentId', 'envNumber name')
      .populate('busId', 'busNumber to');
    console.log(`Updated allocation ID: ${id}, student: ${studentId}, bus: ${busId}, to: ${to}, seat: ${seatNumber}`);
    res.status(200).json({ message: 'Bus allocation updated successfully', allocation: populatedAllocation });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in updateAllocation:', error.message, error.stack);
    res.status(500).json({ message: 'Error updating allocation', error: error.message });
  } finally {
    session.endSession();
  }
};

// Delete bus allocation
export const deleteAllocation = async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid allocation ID: ${id}`);
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }

    const allocation = await BusAllocation.findById(id).session(session);
    if (!allocation) {
      console.log(`Allocation not found for ID: ${id}`);
      return res.status(404).json({ message: 'Allocation not found' });
    }

    const bus = await Bus.findById(allocation.busId).session(session);
    if (bus) {
      bus.allocatedSeats = Array.isArray(bus.allocatedSeats) ? bus.allocatedSeats : [];
      bus.allocatedSeats = bus.allocatedSeats.filter(seat => seat !== allocation.seatNumber);
      await bus.save({ session });
    } else {
      console.warn(`Bus not found for busId: ${allocation.busId} during allocation deletion`);
    }

    await BusAllocation.findByIdAndDelete(id, { session });
    console.log(`Deleted allocation ID: ${id}`);
    await session.commitTransaction();
    res.status(200).json({ message: 'Bus allocation deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in deleteAllocation:', error.message, error.stack);
    res.status(500).json({ message: 'Error deleting allocation', error: error.message });
  } finally {
    session.endSession();
  }
};

// Fetch all allocations with student and bus details
export const getAllAllocations = async (req, res) => {
  try {
    const { busNumber, busId } = req.query;
    console.log(`Fetching allocations for busNumber: ${busNumber || 'all'}, busId: ${busId || 'all'}`);

    let query = {};

    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      query.busId = busId;
      console.log(`Filtering by busId: ${busId}`);
    } else if (busNumber) {
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