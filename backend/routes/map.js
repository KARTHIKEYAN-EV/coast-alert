const express = require('express');
const { query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/map/reports
// @desc    Get reports for map display with location filtering
// @access  Private
router.get('/reports', auth, [
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }),
  query('zoom').optional().isInt({ min: 1, max: 20 }),
  query('bounds').optional().matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  query('status').optional().isIn(['verified', 'pending', 'all']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
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
      lat,
      lng,
      radius = 10,
      zoom = 10,
      bounds,
      status = 'verified',
      severity,
      hazardType
    } = req.query;

    let whereClause = {};
    
    // Filter by status
    if (status === 'verified') {
      whereClause.status = 'verified';
    } else if (status === 'pending') {
      whereClause.status = 'pending';
    } else if (status === 'all') {
      whereClause.status = ['verified', 'pending'];
    }
    
    // Filter by severity
    if (severity) {
      whereClause.severity = severity;
    }
    
    // Filter by hazard type
    if (hazardType) {
      whereClause.hazardType = hazardType;
    }

    // Only show public or own reports for citizens
    if (req.user.role === 'citizen') {
      whereClause[Op.or] = [
        { visibility: 'public' },
        { submittedById: req.user.id }
      ];
    }

    let reports;
    
    if (bounds) {
      // Use bounding box for map viewport
      const [swLat, swLng, neLat, neLng] = bounds.split(',').map(parseFloat);
      
      reports = await Report.findAll({
        where: {
          ...whereClause,
          [Op.and]: [
            sequelize.where(
              sequelize.cast(sequelize.json('location.lat'), 'float'),
              { [Op.between]: [swLat, neLat] }
            ),
            sequelize.where(
              sequelize.cast(sequelize.json('location.lng'), 'float'),
              { [Op.between]: [swLng, neLng] }
            )
          ]
        },
        include: [{
          model: User,
          as: 'submittedBy',
          attributes: ['firstName', 'lastName', 'role']
        }],
        limit: 500, // Prevent overwhelming the map
        order: [['createdAt', 'DESC']]
      });
    } else if (lat && lng) {
      // Use radius search around a point
      const radiusInMeters = radius * 1000;
      
      reports = await Report.findAll({
        where: {
          ...whereClause,
          [Op.and]: sequelize.literal(`
            ST_DWithin(
              ST_SetSRID(ST_MakePoint(CAST(location->>'lng' AS FLOAT), CAST(location->>'lat' AS FLOAT)), 4326),
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
              ${radiusInMeters}
            )
          `)
        },
        include: [{
          model: User,
          as: 'submittedBy',
          attributes: ['firstName', 'lastName', 'role']
        }],
        limit: 200,
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Get recent reports without location filtering
      reports = await Report.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'submittedBy',
          attributes: ['firstName', 'lastName', 'role']
        }],
        limit: 100,
        order: [['createdAt', 'DESC']]
      });
    }

    // Transform reports for map display
    const mapReports = reports.map(report => ({
      id: report.id,
      publicId: report.publicId,
      position: {
        lat: report.location.lat,
        lng: report.location.lng
      },
      hazardType: report.hazardType,
      severity: report.severity,
      status: report.status,
      description: report.description.substring(0, 100) + (report.description.length > 100 ? '...' : ''),
      createdAt: report.createdAt,
      submittedBy: req.user.role !== 'citizen' ? 
        `${report.submittedBy.firstName} ${report.submittedBy.lastName}` : 
        'Community Member',
      hasMedia: report.mediaFiles && report.mediaFiles.length > 0
    }));

    res.json({
      success: true,
      data: {
        reports: mapReports,
        totalCount: mapReports.length,
        filters: {
          status,
          severity,
          hazardType,
          location: lat && lng ? { lat, lng, radius } : null,
          bounds: bounds || null
        }
      }
    });

  } catch (error) {
    logger.error('Map reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/map/clusters
// @desc    Get clustered report data for map performance
// @access  Private
router.get('/clusters', auth, [
  query('zoom').isInt({ min: 1, max: 20 }),
  query('bounds').matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors: errors.array()
      });
    }

    const { zoom, bounds } = req.query;
    const [swLat, swLng, neLat, neLng] = bounds.split(',').map(parseFloat);
    
    // Determine clustering precision based on zoom level
    const precision = Math.max(1, Math.floor(zoom / 3));
    
    const clusters = await Report.findAll({
      attributes: [
        [sequelize.fn('ROUND', sequelize.cast(sequelize.json('location.lat'), 'decimal'), precision), 'cluster_lat'],
        [sequelize.fn('ROUND', sequelize.cast(sequelize.json('location.lng'), 'decimal'), precision), 'cluster_lng'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN severity = 'critical' THEN 1 END")), 'critical_count'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'verified' THEN 1 END")), 'verified_count']
      ],
      where: {
        status: ['verified', 'pending'],
        [Op.and]: [
          sequelize.where(
            sequelize.cast(sequelize.json('location.lat'), 'float'),
            { [Op.between]: [swLat, neLat] }
          ),
          sequelize.where(
            sequelize.cast(sequelize.json('location.lng'), 'float'),
            { [Op.between]: [swLng, neLng] }
          )
        ]
      },
      group: ['cluster_lat', 'cluster_lng'],
      having: sequelize.where(sequelize.fn('COUNT', sequelize.col('id')), '>', 0),
      raw: true
    });

    const clusterData = clusters.map(cluster => ({
      position: {
        lat: parseFloat(cluster.cluster_lat),
        lng: parseFloat(cluster.cluster_lng)
      },
      count: parseInt(cluster.count),
      criticalCount: parseInt(cluster.critical_count),
      verifiedCount: parseInt(cluster.verified_count),
      severity: cluster.critical_count > 0 ? 'critical' : 'normal'
    }));

    res.json({
      success: true,
      data: {
        clusters: clusterData,
        zoom: parseInt(zoom),
        bounds: { swLat, swLng, neLat, neLng }
      }
    });

  } catch (error) {
    logger.error('Map clusters error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/map/heatmap
// @desc    Get heatmap data for hazard density visualization
// @access  Private
router.get('/heatmap', auth, [
  query('hazardType').optional(),
  query('timeRange').optional().isInt({ min: 1, max: 365 }),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const { hazardType, timeRange = 30, severity } = req.query;
    
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    let whereClause = {
      status: 'verified',
      createdAt: { [Op.gte]: startDate }
    };
    
    if (hazardType) whereClause.hazardType = hazardType;
    if (severity) whereClause.severity = severity;

    const heatmapData = await Report.findAll({
      attributes: [
    const heatmapData = await Report.findAll({
      attributes: [
        [sequelize.json('location.lat'), 'lat'],
        [sequelize.json('location.lng'), 'lng'],
        'severity'
      ],
      where: whereClause,
      raw: true
    });

    // Transform data for heatmap visualization
    const points = heatmapData.map(point => ({
      lat: parseFloat(point.lat),
      lng: parseFloat(point.lng),
      weight: getSeverityWeight(point.severity)
    }));

    res.json({
      success: true,
      data: {
        points,
        filters: { hazardType, timeRange, severity },
        totalPoints: points.length
      }
    });

  } catch (error) {
    logger.error('Heatmap data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/map/statistics
// @desc    Get map-based statistics for a region
// @access  Private
router.get('/statistics', auth, [
  query('bounds').optional().matches(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0.1, max: 100 })
], async (req, res) => {
  try {
    const { bounds, lat, lng, radius = 10 } = req.query;
    
    let locationFilter;
    if (bounds) {
      const [swLat, swLng, neLat, neLng] = bounds.split(',').map(parseFloat);
      locationFilter = {
        [Op.and]: [
          sequelize.where(
            sequelize.cast(sequelize.json('location.lat'), 'float'),
            { [Op.between]: [swLat, neLat] }
          ),
          sequelize.where(
            sequelize.cast(sequelize.json('location.lng'), 'float'),
            { [Op.between]: [swLng, neLng] }
          )
        ]
      };
    } else if (lat && lng) {
      const radiusInMeters = radius * 1000;
      locationFilter = sequelize.literal(`
        ST_DWithin(
          ST_SetSRID(ST_MakePoint(CAST(location->>'lng' AS FLOAT), CAST(location->>'lat' AS FLOAT)), 4326),
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${radiusInMeters}
        )
      `);
    }

    if (!locationFilter) {
      return res.status(400).json({
        success: false,
        message: 'Either bounds or lat/lng coordinates required'
      });
    }

    // Get statistics for the region
    const stats = await Report.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'verified' THEN 1 END")), 'verified'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN severity = 'critical' THEN 1 END")), 'critical'],
        'hazardType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: bounds ? locationFilter : { [Op.and]: locationFilter },
      group: ['hazardType'],
      raw: true
    });

    const hazardDistribution = stats.reduce((acc, stat) => {
      acc[stat.hazardType] = parseInt(stat.count);
      return acc;
    }, {});

    const totalStats = await Report.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'verified' THEN 1 END")), 'verified'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN severity = 'critical' THEN 1 END")), 'critical']
      ],
      where: bounds ? locationFilter : { [Op.and]: locationFilter },
      raw: true
    });

    res.json({
      success: true,
      data: {
        overview: {
          total: parseInt(totalStats.total || 0),
          verified: parseInt(totalStats.verified || 0),
          pending: parseInt(totalStats.pending || 0),
          critical: parseInt(totalStats.critical || 0)
        },
        hazardDistribution,
        region: bounds ? 
          { type: 'bounds', bounds } : 
          { type: 'radius', center: { lat, lng }, radius }
      }
    });

  } catch (error) {
    logger.error('Map statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to assign weights for heatmap based on severity
const getSeverityWeight = (severity) => {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 1;
  }
};

module.exports = router;