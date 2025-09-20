const express = require('express');
const { query, validationResult } = require('express-validator');
const { Op, sequelize } = require('sequelize');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { canAccessAnalytics } = require('../middleware/authorization');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private (Analyst, Admin)
router.get('/dashboard', auth, canAccessAnalytics, [
  query('dateRange').optional().isIn(['7d', '30d', '90d', '1y']),
  query('hazardType').optional()
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

    const { dateRange = '30d', hazardType } = req.query;

    // Calculate date range
    const now = new Date();
    const dateMap = {
      '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now - 365 * 24 * 60 * 60 * 1000)
    };
    
    const startDate = dateMap[dateRange];
    const whereClause = { createdAt: { [Op.gte]: startDate } };
    if (hazardType) whereClause.hazardType = hazardType;

    // Basic statistics
    const [totalReports, verifiedReports, pendingReports, criticalReports] = await Promise.all([
      Report.count({ where: whereClause }),
      Report.count({ where: { ...whereClause, status: 'verified' } }),
      Report.count({ where: { ...whereClause, status: 'pending' } }),
      Report.count({ where: { ...whereClause, severity: 'critical' } })
    ]);

    // Reports by status
    const statusStats = await Report.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['status'],
      raw: true
    });

    // Reports by severity
    const severityStats = await Report.findAll({
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['severity'],
      raw: true
    });

    // Reports by hazard type
    const hazardTypeStats = await Report.findAll({
      attributes: [
        'hazardType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['hazardType'],
      raw: true
    });

    // Daily trend data
    const dailyStats = await Report.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        'status'
      ],
      where: whereClause,
      group: [sequelize.fn('DATE', sequelize.col('created_at')), 'status'],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Most active users
    const topReporters = await User.findAll({
      attributes: [
        'id', 'firstName', 'lastName', 'role',
        [sequelize.fn('COUNT', sequelize.col('submittedReports.id')), 'reportCount']
      ],
      include: [{
        model: Report,
        as: 'submittedReports',
        where: whereClause,
        attributes: [],
        required: true
      }],
      group: ['User.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('submittedReports.id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Geographic distribution (simplified)
    const geographicStats = await Report.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.cast(sequelize.fn('ROUND', sequelize.cast(sequelize.json('location.lat'), 'decimal'), 1), 'text'), 'lat_rounded'],
        [sequelize.cast(sequelize.fn('ROUND', sequelize.cast(sequelize.json('location.lng'), 'decimal'), 1), 'text'), 'lng_rounded']
      ],
      where: whereClause,
      group: ['lat_rounded', 'lng_rounded'],
      having: sequelize.where(sequelize.fn('COUNT', sequelize.col('id')), '>', 2),
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 20,
      raw: true
    });

    // Response time analysis for verifiers
    const responseTimeStats = await Report.findAll({
      attributes: [
        [sequelize.fn('AVG', 
          sequelize.literal("EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600")
        ), 'avg_hours'],
        [sequelize.fn('MIN', 
          sequelize.literal("EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600")
        ), 'min_hours'],
        [sequelize.fn('MAX', 
          sequelize.literal("EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600")
        ), 'max_hours']
      ],
      where: {
        ...whereClause,
        status: 'verified',
        verifiedAt: { [Op.ne]: null }
      },
      raw: true
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalReports,
          verifiedReports,
          pendingReports,
          criticalReports,
          verificationRate: totalReports > 0 ? ((verifiedReports / totalReports) * 100).toFixed(1) : 0
        },
        breakdown: {
          byStatus: statusStats.reduce((acc, stat) => {
            acc[stat.status] = parseInt(stat.count);
            return acc;
          }, {}),
          bySeverity: severityStats.reduce((acc, stat) => {
            acc[stat.severity] = parseInt(stat.count);
            return acc;
          }, {}),
          byHazardType: hazardTypeStats.reduce((acc, stat) => {
            acc[stat.hazardType] = parseInt(stat.count);
            return acc;
          }, {})
        },
        trends: {
          daily: dailyStats,
          responseTime: responseTimeStats[0] || {}
        },
        topReporters: topReporters.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          reportCount: parseInt(user.reportCount)
        })),
        geographic: geographicStats.map(stat => ({
          lat: parseFloat(stat.lat_rounded),
          lng: parseFloat(stat.lng_rounded),
          count: parseInt(stat.count)
        })),
        dateRange,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating analytics'
    });
  }
});

// @route   GET /api/analytics/reports/trends
// @desc    Get report submission trends
// @access  Private (Analyst, Admin)
router.get('/reports/trends', auth, canAccessAnalytics, [
  query('period').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']),
  query('days').optional().isInt({ min: 1, max: 365 }).toInt()
], async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let dateFormat, dateGroup;
    switch (period) {
      case 'hourly':
        dateFormat = "YYYY-MM-DD HH24:00";
        dateGroup = sequelize.fn('DATE_TRUNC', 'hour', sequelize.col('created_at'));
        break;
      case 'weekly':
        dateFormat = "YYYY-\"W\"WW";
        dateGroup = sequelize.fn('DATE_TRUNC', 'week', sequelize.col('created_at'));
        break;
      case 'monthly':
        dateFormat = "YYYY-MM";
        dateGroup = sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at'));
        break;
      default: // daily
        dateFormat = "YYYY-MM-DD";
        dateGroup = sequelize.fn('DATE_TRUNC', 'day', sequelize.col('created_at'));
    }

    const trends = await Report.findAll({
      attributes: [
        [sequelize.fn('TO_CHAR', dateGroup, dateFormat), 'period'],
        'severity',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      group: [
        sequelize.fn('TO_CHAR', dateGroup, dateFormat),
        'severity',
        'status'
      ],
      order: [
        [sequelize.fn('TO_CHAR', dateGroup, dateFormat), 'ASC']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        trends,
        period,
        daysAnalyzed: days,
        startDate,
        endDate: new Date()
      }
    });

  } catch (error) {
    logger.error('Report trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/verification/performance
// @desc    Get verification performance metrics
// @access  Private (Analyst, Admin)
router.get('/verification/performance', auth, canAccessAnalytics, async (req, res) => {
  try {
    // Verifier performance metrics
    const verifierStats = await User.findAll({
      attributes: [
        'id', 'firstName', 'lastName',
        [sequelize.fn('COUNT', sequelize.col('verifiedReports.id')), 'totalVerifications'],
        [sequelize.fn('AVG', 
          sequelize.literal("EXTRACT(EPOCH FROM (verifiedReports.verified_at - verifiedReports.created_at)) / 3600")
        ), 'avgResponseTimeHours']
      ],
      include: [{
        model: Report,
        as: 'verifiedReports',
        where: {
          verifiedAt: { [Op.ne]: null },
          createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        attributes: [],
        required: true
      }],
      where: {
        role: ['verifier', 'analyst', 'admin']
      },
      group: ['User.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('verifiedReports.id')), 'DESC']],
      raw: true
    });

    // Overall verification metrics
    const overallStats = await Report.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReports'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'verified' THEN 1 END")), 'verifiedReports'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'rejected' THEN 1 END")), 'rejectedReports'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pendingReports'],
        [sequelize.fn('AVG', 
          sequelize.literal("CASE WHEN verified_at IS NOT NULL THEN EXTRACT(EPOCH FROM (verified_at - created_at)) / 3600 END")
        ), 'avgVerificationTimeHours']
      ],
      where: {
        createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      raw: true
    });

    const stats = overallStats[0];
    const verificationRate = stats.totalReports > 0 ? 
      ((parseInt(stats.verifiedReports) / parseInt(stats.totalReports)) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        overall: {
          totalReports: parseInt(stats.totalReports),
          verifiedReports: parseInt(stats.verifiedReports),
          rejectedReports: parseInt(stats.rejectedReports),
          pendingReports: parseInt(stats.pendingReports),
          verificationRate: parseFloat(verificationRate),
          avgVerificationTimeHours: parseFloat(stats.avgVerificationTimeHours || 0).toFixed(2)
        },
        verifiers: verifierStats.map(verifier => ({
          id: verifier.id,
          name: `${verifier.firstName} ${verifier.lastName}`,
          totalVerifications: parseInt(verifier.totalVerifications),
          avgResponseTimeHours: parseFloat(verifier.avgResponseTimeHours || 0).toFixed(2)
        })),
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Verification performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/exports/csv
// @desc    Export analytics data as CSV
// @access  Private (Analyst, Admin)
router.get('/exports/csv', auth, canAccessAnalytics, [
  query('type').isIn(['reports', 'users', 'verification']).withMessage('Invalid export type'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date format')
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

    const { type, dateFrom, dateTo } = req.query;
    const whereClause = {};
    
    if (dateFrom && dateTo) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'reports':
        const reports = await Report.findAll({
          where: whereClause,
          include: [{
            model: User,
            as: 'submittedBy',
            attributes: ['firstName', 'lastName', 'role']
          }],
          order: [['createdAt', 'DESC']]
        });

        csvData = 'ID,Public ID,Hazard Type,Severity,Status,Description,Location,Submitted By,Created At,Verified At\n';
        reports.forEach(report => {
          csvData += `"${report.id}","${report.publicId}","${report.hazardType}","${report.severity}","${report.status}","${report.description.replace(/"/g, '""')}","${report.location.lat}, ${report.location.lng}","${report.submittedBy.firstName} ${report.submittedBy.lastName}","${report.createdAt}","${report.verifiedAt || ''}"\n`;
        });
        
        filename = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'users':
        const users = await User.findAll({
          where: whereClause,
          attributes: { exclude: ['password', 'resetPasswordToken', 'emailVerificationToken'] }
        });

        csvData = 'ID,Name,Email,Role,Status,Created At,Last Active\n';
        users.forEach(user => {
          csvData += `"${user.id}","${user.firstName} ${user.lastName}","${user.email}","${user.role}","${user.status}","${user.createdAt}","${user.lastActiveAt || ''}"\n`;
        });
        
        filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'verification':
        const verifications = await Report.findAll({
          where: {
            ...whereClause,
            status: ['verified', 'rejected'],
            verifiedAt: { [Op.ne]: null }
          },
          include: [
            {
              model: User,
              as: 'submittedBy',
              attributes: ['firstName', 'lastName']
            },
            {
              model: User,
              as: 'verifiedBy',
              attributes: ['firstName', 'lastName']
            }
          ],
          order: [['verifiedAt', 'DESC']]
        });

        csvData = 'Report ID,Hazard Type,Severity,Status,Submitted By,Verified By,Response Time (hours),Verified At\n';
        verifications.forEach(report => {
          const responseTime = report.verifiedAt ? 
            ((new Date(report.verifiedAt) - new Date(report.createdAt)) / (1000 * 60 * 60)).toFixed(2) : '';
          
          csvData += `"${report.publicId}","${report.hazardType}","${report.severity}","${report.status}","${report.submittedBy.firstName} ${report.submittedBy.lastName}","${report.verifiedBy.firstName} ${report.verifiedBy.lastName}","${responseTime}","${report.verifiedAt}"\n`;
        });
        
        filename = `verification_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);

    logger.info(`Analytics export generated: ${type} by user ${req.user.id}`);

  } catch (error) {
    logger.error('Analytics export error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating export'
    });
  }
});

module.exports = router;