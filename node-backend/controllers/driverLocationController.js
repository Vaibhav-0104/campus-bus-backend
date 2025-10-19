import Driver from '../models/Driver.js';
import DriverLocation from '../models/DriverLocation.js';

// Start location sharing
export const startLocationSharing = async (req, res) => {
    try {
        const { driverId, latitude, longitude, address } = req.body;

        // Validate driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Check if driver is active
        if (driver.status !== 'Active') {
            return res.status(403).json({ message: 'Driver account is inactive' });
        }

        // Check if location document exists, if not create, else update
        let location = await DriverLocation.findOne({ driverId });
        if (!location) {
            location = new DriverLocation({
                driverId,
                latitude,
                longitude,
                address,
                shareStatus: true
            });
        } else {
            location.latitude = latitude;
            location.longitude = longitude;
            location.address = address;
            location.shareStatus = true;
        }

        await location.save();
        res.status(200).json({ message: 'Location sharing started successfully!', shareStatus: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Stop location sharing
export const stopLocationSharing = async (req, res) => {
    try {
        const { driverId } = req.body;

        // Validate driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Find and update location document
        const location = await DriverLocation.findOne({ driverId });
        if (!location) {
            return res.status(404).json({ message: 'Location sharing not started for this driver', shareStatus: false });
        }

        location.shareStatus = false;
        await location.save();
        res.status(200).json({ message: 'Location sharing stopped successfully!', shareStatus: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update location
export const updateLocation = async (req, res) => {
    try {
        const { driverId, latitude, longitude, address } = req.body;

        // Validate driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Find and update location document
        const location = await DriverLocation.findOne({ driverId });
        if (!location) {
            return res.status(404).json({ message: 'Location sharing not started for this driver', shareStatus: false });
        }

        // Update only if sharing is active
        if (!location.shareStatus) {
            return res.status(400).json({ message: 'Location sharing is not active', shareStatus: false });
        }

        location.latitude = latitude;
        location.longitude = longitude;
        location.address = address;
        location.updatedAt = Date.now();

        await location.save();
        res.status(200).json({ message: 'Location updated successfully!', shareStatus: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get location sharing status
export const getLocationSharingStatus = async (req, res) => {
    try {
        const { driverId } = req.query;

        // Validate driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found', shareStatus: false });
        }

        // Find location document
        const location = await DriverLocation.findOne({ driverId });
        if (!location) {
            return res.status(200).json({ message: 'Location sharing not started', shareStatus: false });
        }

        res.status(200).json({ message: 'Location sharing status retrieved', shareStatus: location.shareStatus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};