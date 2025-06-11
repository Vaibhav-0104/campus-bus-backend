import connectDB from '../config/db.js'; // Adjust path to your db.js
import mongoose from 'mongoose';
import Bus from '../models/Bus.js';
import Driver from '../models/Driver.js';

async function migrateBuses() {
  try {
    await connectDB();
    console.log('Starting bus migration...');
    const buses = await Bus.find();
    console.log(`Found ${buses.length} buses to migrate`);
    for (const bus of buses) {
      if (!bus.driver) {
        console.log(`No driver name found for bus ${bus.busNumber} (${bus._id})`);
        continue;
      }
      const driver = await Driver.findOne({ name: bus.driver });
      if (!driver) {
        console.log(`No driver found for driver name "${bus.driver}" in bus ${bus.busNumber} (${bus._id})`);
        continue;
      }
      await Bus.updateOne(
        { _id: bus._id },
        {
          $set: { driverId: driver._id },
          $unset: { driver: '' },
        }
      );
      console.log(`Updated bus ${bus.busNumber} (${bus._id}) with driverId ${driver._id}`);
    }
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message, error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateBuses();