const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { requireRole, canManageUsers } = require('../middleware/authorization');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get users list (admin only)
// @access  Private (Admin)
router.get('/', auth, canManageUsers, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['citizen', 'verifier', 'analyst', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending'])
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
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { organizationName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'resetPasswordToken', 'emailVerificationToken'] },
      include: [
        {
          model: Report,
          as: 'submittedReports',
          attributes: ['id', 'status', 'createdAt'],
          separate: true,
          limit: 3,
          order: [['createdAt', 'DESC']]
        }
      ],
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    // Calculate statistics for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const stats = {
        totalReports: await user.countSubmittedReports(),
        verifiedReports: await user.countSubmittedReports({ where: { status: 'verified' } }),
        pendingReports: await user.countSubmittedReports({ where: { status: 'pending' } })
      };

      if (user.canVerifyReports()) {
        stats.reportsVerified = await user.countVerifiedReports();
      }

      return {
        ...user.toJSON(),
        statistics: stats
      };
    }));

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: count,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/statistics
// @desc    Get user statistics overview
// @access  Private (Admin)
router.get('/statistics', auth, canManageUsers, async (req, res) => {
  try {
    const stats = await User.getStatistics();
    
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const newUsersThisMonth = await User.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    // Role distribution
    const roleStats = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    const formattedRoleStats = roleStats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        roleDistribution: formattedRoleStats,
        detailedStats: stats
      }
    });

  } catch (error) {
    logger.error('User statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile (admin or self)
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this profile
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'emailVerificationToken'] },
      include: [
        {
          model: Report,
          as: 'submittedReports',
          attributes: ['id', 'hazardType', 'severity', 'status', 'createdAt', 'publicId'],
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Report,
          as: 'verifiedReports',
          attributes: ['id', 'hazardType', 'severity', 'status', 'createdAt', 'publicId'],
          limit: 10,
          order: [['verifiedAt', 'DESC']],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user statistics
    const statistics = {
      totalReports: await user.countSubmittedReports(),
      verifiedReports: await user.countSubmittedReports({ where: { status: 'verified' } }),
      pendingReports: await user.countSubmittedReports({ where: { status: 'pending' } }),
      rejectedReports: await user.countSubmittedReports({ where: { status: 'rejected' } })
    };

    if (user.canVerifyReports()) {
      statistics.reportsVerified = await user.countVerifiedReports();
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        statistics
      }
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private (Admin)
router.put('/:id/role', auth, canManageUsers, [
  body('role')
    .isIn(['citizen', 'verifier', 'analyst', 'admin'])
    .withMessage('Invalid role')
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
    const { role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self role change to non-admin
    if (req.user.id === id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own admin role'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    logger.info(`User role updated: ${user.email} from ${oldRole} to ${role} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (admin only)
// @access  Private (Admin)
router.put('/:id/status', auth, canManageUsers, [
  body('status')
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
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
    const { status, reason } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self suspension
    if (req.user.id === id && status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend your own account'
      });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Log status change with reason
    logger.info(`User status updated: ${user.email} from ${oldStatus} to ${status} by admin ${req.user.id}${reason ? ` - Reason: ${reason}` : ''}`);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user account (admin only or self)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions: user can delete own account or admin can delete any
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion for admin
    if (req.user.id === id && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot delete their own account'
      });
    }

    // Soft delete: deactivate instead of actual deletion
    user.status = 'inactive';
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    logger.info(`User account deleted: ${id} by ${req.user.id}`);

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity history
// @access  Private (Admin or self)
router.get('/:id/activity', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's submitted reports
    const submittedReports = await Report.findAll({
      where: { submittedById: id },
      attributes: ['id', 'publicId', 'hazardType', 'severity', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get user's verified reports (if verifier)
    let verifiedReports = [];
    if (user.canVerifyReports()) {
      verifiedReports = await Report.findAll({
        where: { verifiedById: id },
        attributes: ['id', 'publicId', 'hazardType', 'severity', 'status', 'verifiedAt'],
        include: [{
          model: User,
          as: 'submittedBy',
          attributes: ['firstName', 'lastName']
        }],
        order: [['verifiedAt', 'DESC']],
        limit: 20
      });
    }

    // Calculate activity metrics
    const metrics = {
      totalReports: submittedReports.length,
      reportsThisMonth: submittedReports.filter(r => 
        new Date(r.createdAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      ).length,
      totalVerified: verifiedReports.length,
      averageResponseTime: user.canVerifyReports() ? calculateAverageResponseTime(verifiedReports) : null
    };

    res.json({
      success: true,
      data: {
        submittedReports,
        verifiedReports,
        metrics
      }
    });

  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to calculate average response time
const calculateAverageResponseTime = (reports) => {
  if (reports.length === 0) return 0;
  
  const totalTime = reports.reduce((sum, report) => {
    const submitTime = new Date(report.createdAt);
    const verifyTime = new Date(report.verifiedAt);
    return sum + (verifyTime - submitTime);
  }, 0);
  
  return Math.round(totalTime / reports.length / (1000 * 60 * 60)); // Convert to hours
};

module.exports = router;