const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import the new Mongoose database connector
const { connectDB } = require('./src/config/database'); 

// --- Routes and Middleware (No changes here) ---
const authRoutes = require('./src/routes/auth');
const reportRoutes = require('./src/routes/reports');
const userRoutes = require('./src/routes/users');
const analyticsRoutes = require('./src/routes/analytics');
const mapRoutes = require('./src/routes/map');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security, Rate Limiting, Body Parsing, etc. (No changes here) ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));

// --- Mongoose Change: Initiate the database connection ---
connectDB();

// --- Routes (No changes here) ---
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/map', mapRoutes);

// --- Error Handling and Server Start (No changes here) ---
app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  logger.info(`🌊 Ocean Hazard Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});