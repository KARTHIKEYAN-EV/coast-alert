const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Retrieve the MongoDB connection string from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ocean_hazard_db';

/**
 * Connects to the MongoDB database.
 */
const connectDB = async () => {
  try {
    // FIXED: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
    // Modern Mongoose versions handle these automatically
    const options = {
      // You can add other valid options here if needed
      // serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      // socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(MONGO_URI, options);
    
    logger.info(`MongoDB connected successfully to: ${MONGO_URI.split('@')[1] || MONGO_URI}`);
    
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

/**
 * Closes the MongoDB connection.
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error.message);
  }
};

// Event listeners for the Mongoose connection
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from DB');
});

module.exports = { connectDB, closeDB };