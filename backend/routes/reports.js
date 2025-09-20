const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const upload = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateReportCreation = [
  body('hazardType')
    .isIn(['flood', 'high-waves', 'coastal-erosion', 'storm-surge', 'tsunami', 'oil-spill', 'marine-debris', 'red-tide', 'infrastructure-damage', 'other'])
    .withMessage('Invalid hazard type'),
  
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  
  body('urgency')
    .optional()
    .isIn(['routine', 'urgent', 'immediate', 'emergency'])
    .withMessage('Invalid urgency level'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('location.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  
  body('location.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
];

const validateReportUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'verified', 'rejected', 'under_review', 'resolved'])
    .withMessage('Invalid status'),
  
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason must not exceed 1000 characters')
];

// @route   POST /api/reports
// @desc    Submit a new hazard report
// @access  Private
router.post('/', auth, upload.array('media', 5), validateReportCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      hazardType,
      severity,
      urgency = 'routine',
      description,
      location,
      address,
      weatherConditions,
      tideLevel,
      waveHeight,
      windSpeed,
      affectedArea,
      estimatedDamage,
      peopleAffected,
      tags
    } = req.body;

    // Process uploaded media files
    const mediaFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        mediaFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedAt: new Date()
        });
      }
    }

    // Create the report
    const report = await Report.create({
      hazardType,
      severity,
      urgency,
      description,
      location: JSON.parse(location),
      address,
      submittedById: req.user.id,
      mediaFiles,
      weatherConditions: weatherConditions ? JSON.parse(weatherConditions) : null,
      tideLevel: parseFloat(tideLevel) || null,
      waveHeight: parseFloat(waveHeight) || null,
      windSpeed: parseFloat(windSpeed) || null,
      affectedArea: parseFloat(affectedArea) || null,
      estimatedDamage,
      peopleAffected: parseInt(peopleAffected) || null,
      tags: tags ? JSON.parse(tags) : []
    });

    // Load the report with user data
    const fullReport = await Report.findByPk(report.id, {
      include: [{
        model: User,
        as: 'submittedBy',
        attributes: ['id', 'firstName', 'lastName', 'role']
      }]
    });

    logger.info(`New report submitted: ${report.publicId} by user ${req.user.id}`);

    // Send notification for critical reports (implement as needed)
    if (report.isCritical()) {
      logger.warn(`Critical report submitted: ${report.publicId}`);
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        report: fullReport
      }
    });

  } catch (error) {
    logger.error('Report submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during report submission'
    });
  }
});

// @route   GET /api/reports
// @desc    Get reports with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['pending', 'verified', 'rejected', 'under_review', 'resolved']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('hazardType').optional(),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0.1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      severity,
      hazardType,
      lat,
      lng,
      radius = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (hazardType) whereClause.hazardType = hazardType;
    
    if (search) {
      whereClause[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { publicId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Handle location-based filtering
    let locationFilter = null;
    if (lat && lng) {
      locationFilter = sequelize.literal(`
        ST_DWithin(
          ST_SetSRID(ST_MakePoint(CAST(location->>'lng' AS FLOAT), CAST(location->>'lat' AS FLOAT)), 4326),
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${radius * 1000}
        )
      `);
    }

    const offset = (page - 1) * limit;

    const { count, rows: reports } = await Report.findAndCountAll({
      where: locationFilter ? { ...whereClause, [Op.and]: locationFilter } : whereClause,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'verifiedBy',
          attributes: ['id', 'firstName', 'lastName', 'role'],
          required: false
        }
      ],
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages,
          totalReports: count,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          status,
          severity,
          hazardType,
          location: lat && lng ? { lat, lng, radius } : null
        }
      }
    });

  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Base statistics for all users
    const baseStats = await Report.getStatistics();
    
    // Get recent reports
    const recentReports = await Report.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'submittedBy',
        attributes: ['id', 'firstName', 'lastName', 'role']
      }]
    });

    // Role-specific data
    let roleSpecificData = {};
    
    if (userRole === 'citizen') {
      // Get user's own reports
      const userReports = await Report.findAll({
        where: { submittedById: userId },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      roleSpecificData = {
        userReports,
        totalSubmitted: await Report.count({ where: { submittedById: userId } })
      };
    } else if (['verifier', 'analyst', 'admin'].includes(userRole)) {
      // Get pending reports for verification
      const pendingReports = await Report.findAll({
        where: { status: 'pending' },
        order: [['createdAt', 'DESC']],
        limit: 10,
        include: [{
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }]
      });

      roleSpecificData = {
        pendingReports,
        totalPending: await Report.count({ where: { status: 'pending' } }),
        totalVerified: await Report.count({ where: { verifiedById: userId } })
      };
    }

    // Critical alerts
    const criticalReports = await Report.findCriticalReports();

    res.json({
      success: true,
      data: {
        statistics: baseStats,
        recentReports,
        criticalReports,
        ...roleSpecificData
      }
    });

  } catch (error) {
    logger.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get a specific report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a public ID or UUID
    const report = await Report.findOne({
      where: {
        [Op.or]: [
          { id },
          { publicId: id }
        ]
      },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'firstName', 'lastName', 'role', 'organizationName']
        },
        {
          model: User,
          as: 'verifiedBy',
          attributes: ['id', 'firstName', 'lastName', 'role'],
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user can view this report
    const canView = 
      report.submittedById === req.user.id ||
      req.user.role !== 'citizen' ||
      report.visibility === 'public';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        report
      }
    });

  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update a report (verify/reject/modify)
// @access  Private
router.put('/:id', auth, validateReportUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, rejectionReason, ...otherUpdates } = req.body;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions
    const canUpdate = 
      report.submittedById === req.user.id ||
      (req.user.canVerifyReports() && ['pending', 'under_review'].includes(report.status));

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Handle status changes
    if (status && status !== report.status) {
      if (['verified', 'rejected'].includes(status) && req.user.canVerifyReports()) {
        report.status = status;
        report.verifiedById = req.user.id;
        report.verifiedAt = new Date();
        
        if (status === 'rejected' && rejectionReason) {
          report.rejectionReason = rejectionReason;
        }
      } else if (report.submittedById === req.user.id && status === 'under_review') {
        report.status = status;
      }
    }

    // Apply other updates (only for report owner or verifiers)
    Object.keys(otherUpdates).forEach(key => {
      if (report.submittedById === req.user.id || req.user.canVerifyReports()) {
        report[key] = otherUpdates[key];
      }
    });

    await report.save();

    // Load updated report with relations
    const updatedReport = await Report.findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'verifiedBy',
          attributes: ['id', 'firstName', 'lastName', 'role'],
          required: false
        }
      ]
    });

    logger.info(`Report updated: ${report.publicId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: {
        report: updatedReport
      }
    });

  } catch (error) {
    logger.error('Report update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a report (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Only report owner or admins can delete
    if (report.submittedById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete by setting status
    report.status = 'deleted';
    report.visibility = 'private';
    await report.save();

    logger.info(`Report deleted: ${report.publicId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    logger.error('Report deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/public/:publicId
// @desc    Get a public report by public ID (no auth required)
// @access  Public
router.get('/public/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    const report = await Report.findOne({
      where: { 
        publicId,
        visibility: 'public',
        status: ['verified', 'resolved']
      },
      include: [{
        model: User,
        as: 'submittedBy',
        attributes: ['firstName', 'role'] // Limited info for public view
      }]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Public report not found'
      });
    }

    res.json({
      success: true,
      data: {
        report: report.toPublicJSON()
      }
    });

  } catch (error) {
    logger.error('Get public report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reports/media/:filename
// @desc    Get media file
// @access  Private
router.get('/media/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Find report containing this media file
    const report = await Report.findOne({
      where: {
        mediaFiles: {
          [Op.contains]: [{ filename }]
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Check permissions
    const canView = 
      report.submittedById === req.user.id ||
      req.user.role !== 'citizen' ||
      report.visibility === 'public';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.sendFile(path.resolve(filePath));

  } catch (error) {
    logger.error('Media file access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/reports/:id/verify
// @desc    Quick verify a report
// @access  Private (Verifiers only)
router.post('/:id/verify', auth, requireRole(['verifier', 'analyst', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationLevel = 'expert_verified' } = req.body;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Report is not pending verification'
      });
    }

    report.status = 'verified';
    report.verificationLevel = verificationLevel;
    report.verifiedById = req.user.id;
    report.verifiedAt = new Date();

    await report.save();

    logger.info(`Report verified: ${report.publicId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Report verified successfully',
      data: { report }
    });

  } catch (error) {
    logger.error('Report verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/reports/:id/reject
// @desc    Quick reject a report
// @access  Private (Verifiers only)
router.post('/:id/reject', auth, requireRole(['verifier', 'analyst', 'admin']), [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Report is not pending verification'
      });
    }

    report.status = 'rejected';
    report.rejectionReason = reason;
    report.verifiedById = req.user.id;
    report.verifiedAt = new Date();

    await report.save();

    logger.info(`Report rejected: ${report.publicId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Report rejected successfully',
      data: { report }
    });

  } catch (error) {
    logger.error('Report rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;