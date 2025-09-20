const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [8, 255]
    }
  },
  
  role: {
    type: DataTypes.ENUM('citizen', 'verifier', 'analyst', 'admin'),
    allowNull: false,
    defaultValue: 'citizen'
  },
  
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  profileImage: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isNumeric: true
    }
  },
  
  organizationName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  expertiseArea: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  verificationLevel: {
    type: DataTypes.ENUM('unverified', 'email_verified', 'phone_verified', 'fully_verified'),
    allowNull: false,
    defaultValue: 'unverified'
  },
  
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      emailNotifications: true,
      smsNotifications: false,
      language: 'en',
      timezone: 'UTC'
    }
  },
  
  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  },
  
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['last_active_at'] }
  ]
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.isActive = function() {
  return this.status === 'active';
};

User.prototype.canVerifyReports = function() {
  return ['verifier', 'analyst', 'admin'].includes(this.role);
};

User.prototype.canManageUsers = function() {
  return ['admin'].includes(this.role);
};

User.prototype.canAccessAnalytics = function() {
  return ['analyst', 'admin'].includes(this.role);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.resetPasswordToken;
  delete values.emailVerificationToken;
  return values;
};

// Class methods
User.findByEmail = async function(email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findActiveUsers = async function() {
  return this.findAll({ where: { status: 'active' } });
};

User.getStatistics = async function() {
  const stats = await this.findAll({
    attributes: [
      'role',
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['role', 'status'],
    raw: true
  });
  
  return stats.reduce((acc, stat) => {
    if (!acc[stat.role]) acc[stat.role] = {};
    acc[stat.role][stat.status] = parseInt(stat.count);
    return acc;
  }, {});
};

module.exports = User;