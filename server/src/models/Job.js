const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [5, 255]
    }
  },
  company: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  salary: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'intern'),
    allowNull: false,
    defaultValue: 'full-time'
  },
  experience: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [50, 5000]
    }
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [20, 3000]
    }
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  applicationsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  viewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  employerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'jobs',
  timestamps: true,
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['location']
    },
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['employerId']
    }
  ]
});

module.exports = Job;
