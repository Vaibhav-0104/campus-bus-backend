import mongoose from 'mongoose';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';

// Get all buses
export const getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find().populate('driverId', 'name');
    res.status(200).json(buses);
  } catch (error) {
    console.error('Error fetching buses:', error.message);
    res.status(500).json({ message: 'Error fetching buses', error: error.message });
  }
};

// Get a single bus by ID
export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('driverId', 'name');
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    res.status(200).json(bus);
  } catch (error) {
    console.error('Error fetching bus:', error.message);
    res.status(500).json({ message: 'Error fetching bus', error: error.message });
  }
};

// Create a new bus
export const createBus = async (req, res) => {
  try {
    const { busNumber, to, capacity, driverId, status } = req.body;

    // Validate inputs
    if (!busNumber || !to || !capacity || !driverId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: 'Invalid driverId' });
    }
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({ message: 'Bus number already exists' });
    }
    // Check if driver is already assigned
    const assignedBus = await Bus.findOne({ driverId });
    if (assignedBus) {
      return res.status(400).json({ message: 'Driver is already assigned to a bus' });
    }

    const newBus = new Bus({
      busNumber,
      from: 'Uka Tarsadia University',
      to,
      capacity,
      driverId,
      status: status || 'Active',
    });
    await newBus.save();
    const populatedBus = await Bus.findById(newBus._id).populate('driverId', 'name');
    res.status(201).json({ message: 'Bus added successfully', newBus: populatedBus });
  } catch (error) {
    console.error('Error adding bus:', error.message);
    res.status(500).json({ message: 'Error adding bus', error: error.message });
  }
};

// Update bus details
export const updateBus = async (req, res) => {
  try {
    const { busNumber, to, capacity, driverId, status } = req.body;

    // Validate inputs
    if (!busNumber || !to || !capacity || !driverId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: 'Invalid driverId' });
    }
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    const existingBus = await Bus.findOne({ busNumber, _id: { $ne: req.params.id } });
    if (existingBus) {
      return res.status(400).json({ message: 'Bus number already exists' });
    }
    // Check if changing driver and new driver is assigned to another bus
    const currentBus = await Bus.findById(req.params.id);
    if (!currentBus) return res.status(404).json({ message: 'Bus not found' });
    if (driverId !== currentBus.driverId.toString()) {
      const assignedBus = await Bus.findOne({ driverId });
      if (assignedBus) {
        return res.status(400).json({ message: 'Driver is already assigned to another bus' });
      }
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        busNumber,
        from: 'Uka Tarsadia University',
        to,
        capacity,
        driverId,
        status: status || 'Active',
      },
      { new: true }
    ).populate('driverId', 'name');
    if (!updatedBus) return res.status(404).json({ message: 'Bus not found' });
    res.status(200).json({ message: 'Bus updated successfully', updatedBus });
  } catch (error) {
    console.error('Error updating bus:', error.message);
    res.status(500).json({ message: 'Error updating bus', error: error.message });
  }
};

// Delete a bus
export const deleteBus = async (req, res) => {
  try {
    const deletedBus = await Bus.findByIdAndDelete(req.params.id);
    if (!deletedBus) return res.status(404).json({ message: 'Bus not found' });
    res.status(200).json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error.message);
    res.status(500).json({ message: 'Error deleting bus', error: error.message });
  }
};