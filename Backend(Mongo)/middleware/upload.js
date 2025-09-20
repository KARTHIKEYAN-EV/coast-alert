const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4,video/mpeg').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Middleware to process uploaded images
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const processedFiles = [];

    for (const file of req.files) {
      if (file.mimetype.startsWith('image/')) {
        // Create thumbnails for images
        const thumbnailPath = path.join(
          path.dirname(file.path),
          `thumb-${path.basename(file.filename)}`
        );

        await sharp(file.path)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

        // Optimize original image
        await sharp(file.path)
          .jpeg({ quality: 85 })
          .toFile(file.path + '.optimized');

        // Replace original with optimized version
        fs.renameSync(file.path + '.optimized', file.path);

        processedFiles.push({
          ...file,
          thumbnailPath: thumbnailPath
        });
      } else {
        processedFiles.push(file);
      }
    }

    req.files = processedFiles;
    next();
  } catch (error) {
    logger.error('Image processing error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error processing uploaded images'
    });
  }
};

// Error handling middleware for multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 5 files allowed';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name for file upload';
        break;
      default:
        message = err.message;
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
      error: err.code
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
};

// Cleanup uploaded files (for use in error scenarios)
const cleanupFiles = (files) => {
  if (!files || !Array.isArray(files)) return;

  files.forEach(file => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      // Also cleanup thumbnail if it exists
      if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) {
        fs.unlinkSync(file.thumbnailPath);
      }
    } catch (error) {
      logger.error('Error cleaning up file:', error);
    }
  });
};

// Validate file before processing
const validateFile = (file) => {
  const errors = [];

  // Check file size
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760;
  if (file.size > maxSize) {
    errors.push(`File ${file.originalname} is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${(maxSize / (1024 * 1024))}MB`);
  }

  // Check file type
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4,video/mpeg').split(',');
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} not allowed for ${file.originalname}`);
  }

  // Check filename length
  if (file.originalname.length > 255) {
    errors.push(`Filename too long: ${file.originalname.substring(0, 50)}...`);
  }

  return errors;
};

// Get file info
const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `/api/reports/media/${file.filename}`,
    thumbnailUrl: file.thumbnailPath ? `/api/reports/media/thumb-${file.filename}` : null,
    uploadedAt: new Date()
  };
};

module.exports = {
  upload,
  processImages,
  handleUploadErrors,
  cleanupFiles,
  validateFile,
  getFileInfo
};