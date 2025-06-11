import Driver from '../models/Driver.js';
import BusAllocation from '../models/BusAllocation.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';

// Fetch all drivers
export const getDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add new driver
export const addDriver = async (req, res) => {
    try {
        const newDriver = new Driver(req.body);
        await newDriver.save();
        res.status(201).json({ message: 'Driver added successfully!' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update driver
export const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        await Driver.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ message: 'Driver updated successfully!' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete driver
export const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        await Driver.findByIdAndDelete(id);
        res.json({ message: 'Driver deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login - Check email & password
export const loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        const driver = await Driver.findOne({ email, password });

        if (!driver) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (driver.status !== 'Active') {
            return res.status(403).json({ message: "Your account is inactive. Please contact admin." });
        }

        res.status(200).json({
            message: "Login successful",
            driver: {
                id: driver._id,
                name: driver.name,
                email: driver.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get attendance for students on driver's bus
export const getBusAttendance = async (req, res) => {
    try {
        const { driverId, date } = req.query;

        // Find bus allocation for the driver
        const allocation = await BusAllocation.findOne({ driverId }).populate('studentIds');
        
        if (!allocation) {
            return res.status(404).json({ message: 'No bus allocation found for this driver' });
        }

        // Get student IDs from allocation
        const studentIds = allocation.studentIds.map(student => student._id);

        // Fetch students
        const students = await Student.find({ _id: { $in: studentIds } });

        // Fetch attendance for the given date
        const attendanceRecords = await Attendance.find({
            studentId: { $in: studentIds },
            date: new Date(date)
        });

        // Map students with their attendance status
        const attendanceData = students.map(student => {
            const attendance = attendanceRecords.find(record => record.studentId.toString() === student._id.toString());
            return {
                name: student.name,
                envNumber: student.envNumber,
                status: attendance ? attendance.status : 'Absent' // Default to Absent if no record
            };
        });

        res.json(attendanceData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};