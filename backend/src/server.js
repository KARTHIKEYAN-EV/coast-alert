require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const connectDB = require("./config/database"); // MongoDB connection
const logger = require("../utils/logger");
const errorHandler = require("../middleware/errorHandler"); // Correct path

// Routes
const authRoutes = require("../routes/auth");
const reportRoutes = require("../routes/reports");
const userRoutes = require("../routes/users");
const analyticsRoutes = require("../routes/analytics");
const mapRoutes = require("../routes/map");

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: "Too many requests from this IP, please try again later."
}));

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression & logging
app.use(compression());
app.use(morgan("combined", { stream: { write: msg => logger.info(msg.trim()) } }));

// Static uploads
app.use("/uploads", express.static("uploads"));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/map", mapRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Error handler (must be after all routes)
app.use(errorHandler);

// 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB(); // Connect to MongoDB
    logger.info("✅ Database connected");

    app.listen(PORT, () => {
      logger.info(`🌊 Aquasentra Backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
