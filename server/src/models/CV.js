const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CV = sequelize.define('CV', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  candidateName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  position: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 50
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  education: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  workExperience: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  projects: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  certifications: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  aiScore: {
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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'cvs',
  timestamps: true,
  indexes: [
    {
      fields: ['candidateName']
    },
    {
      fields: ['position']
    },
    {
      fields: ['experience']
    },
    {
      fields: ['location']
    },
    {
      fields: ['aiScore']
    },
    {
      fields: ['isAnalyzed']
    },
    {
      fields: ['candidateId']
    }
  ]
});

module.exports = CV;
