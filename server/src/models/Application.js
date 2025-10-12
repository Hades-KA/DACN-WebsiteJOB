const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  coverLetter: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expectedSalary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  availableFrom: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  aiMatchScore: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    validate: {
      min: 0,
      max: 10
    }
  },
  aiAnalysis: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  isAnalyzed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id'
    }
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cvId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'cvs',
      key: 'id'
    }
  }
}, {
  tableName: 'applications',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['jobId']
    },
    {
      fields: ['candidateId']
    },
    {
      fields: ['aiMatchScore']
    },
    {
      unique: true,
      fields: ['jobId', 'candidateId']
    }
  ]
});

module.exports = Application;
