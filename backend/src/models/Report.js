const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  hazardType: {
    type: DataTypes.ENUM(
      'flood',
      'high-waves', 
      'coastal-erosion',
      'storm-surge',
      'tsunami',
      'oil-spill',
      'marine-debris',
      'red-tide',
      'infrastructure-damage',
      'other'
    ),
    allowNull: false
  },
  
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false
  },
  
  urgency: {
    type: DataTypes.ENUM('routine', 'urgent', 'immediate', 'emergency'),
    allowNull: false,
    defaultValue: 'routine'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 2000]
    }
  },
  
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      hasLatLng(value) {
        if (!value.lat || !value.lng) {
          throw new Error('Location must have latitude and longitude');
        }
      }
    }
  },
  
  address: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'under_review', 'resolved'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  verificationLevel: {
    type: DataTypes.ENUM('unverified', 'community_verified', 'expert_verified', 'official_verified'),
    allowNull: false,
    defaultValue: 'unverified'
  },
  
  visibility: {
    type: DataTypes.ENUM('public', 'restricted', 'private'),
    allowNull: false,
    defaultValue: 'public'
  },
  
  submittedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  verifiedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  mediaFiles: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  weatherConditions: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  tideLevel: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  
  waveHeight: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  
  windSpeed: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true
  },
  
  affectedArea: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  
  estimatedDamage: {
    type: DataTypes.ENUM('none', 'minor', 'moderate', 'major', 'severe'),
    allowNull: true
  },
  
  peopleAffected: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  isEmergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  additionalData: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  publicId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reports',
  
  hooks: {
    beforeCreate: (report) => {
      // Generate public ID
      report.publicId = 'RPT' + Date.now().toString(36).toUpperCase() + 
        Math.random().toString(36).substr(2, 5).toUpperCase();
      
      // Set emergency flag based on severity and urgency
      report.isEmergency = report.severity === 'critical' || report.urgency === 'emergency';
      
      // Set expiration for resolved reports
      if (report.status === 'resolved') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90); // 90 days retention
        report.expiresAt = expiryDate;
      }
    },
    
    beforeUpdate: (report) => {
      if (report.changed('status') && report.status === 'verified') {
        report.verifiedAt = new Date();
      }
      
      if (report.changed('status') && report.status === 'resolved') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        report.expiresAt = expiryDate;
      }
    }
  },
  
  indexes: [
    { fields: ['submitted_by_id'] },
    { fields: ['status'] },
    { fields: ['severity'] },
    { fields: ['hazard_type'] },
    { fields: ['urgency'] },
    { fields: ['created_at'] },
    { fields: ['is_emergency'] },
    { fields: ['public_id'], unique: true },
    { fields: ['expires_at'] },
    {
      fields: ['location'],
      using: 'gin'
    }
  ]
});

// Define associations
Report.belongsTo(User, { 
  foreignKey: 'submittedById', 
  as: 'submittedBy' 
});

Report.belongsTo(User, { 
  foreignKey: 'verifiedById', 
  as: 'verifiedBy' 
});

User.hasMany(Report, { 
  foreignKey: 'submittedById', 
  as: 'submittedReports' 
});

User.hasMany(Report, { 
  foreignKey: 'verifiedById', 
  as: 'verifiedReports' 
});

// Instance methods
Report.prototype.isPending = function() {
  return this.status === 'pending';
};

Report.prototype.isVerified = function() {
  return this.status === 'verified';
};

Report.prototype.isRejected = function() {
  return this.status === 'rejected';
};

Report.prototype.isCritical = function() {
  return this.severity === 'critical' || this.urgency === 'emergency';
};

Report.prototype.getDistanceFromPoint = function(lat, lng) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat - this.location.lat) * Math.PI / 180;
  const dLng = (lng - this.location.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

Report.prototype.toPublicJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Remove sensitive data for public view
  if (this.visibility === 'public') {
    delete values.submittedById;
    delete values.verifiedById;
    delete values.additionalData;
  }
  
  return values;
};

// Class methods
Report.findByPublicId = async function(publicId) {
  return this.findOne({ where: { publicId } });
};

Report.findNearLocation = async function(lat, lng, radiusKm = 10) {
  return this.findAll({
    where: sequelize.literal(`
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(CAST(location->>'lng' AS FLOAT), CAST(location->>'lat' AS FLOAT)), 4326),
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      )
    `)
  });
};

Report.getStatistics = async function(dateRange = null) {
  const whereClause = dateRange ? {
    createdAt: {
      [sequelize.Op.between]: [dateRange.start, dateRange.end]
    }
  } : {};
  
  const stats = await this.findAll({
    attributes: [
      'status',
      'severity',
      'hazardType',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: whereClause,
    group: ['status', 'severity', 'hazardType'],
    raw: true
  });
  
  return stats;
};

Report.findCriticalReports = async function() {
  return this.findAll({
    where: {
      [sequelize.Op.or]: [
        { severity: 'critical' },
        { urgency: 'emergency' },
        { isEmergency: true }
      ],
      status: ['pending', 'verified']
    },
    order: [['createdAt', 'DESC']],
    include: [{
      model: User,
      as: 'submittedBy',
      attributes: ['id', 'firstName', 'lastName', 'role']
    }]
  });
};

Report.cleanupExpiredReports = async function() {
  const result = await this.destroy({
    where: {
      expiresAt: {
        [sequelize.Op.lt]: new Date()
      }
    }
  });
  
  return result;
};

module.exports = Report;