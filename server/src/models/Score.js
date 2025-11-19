const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Score = sequelize.define('Score', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  applicationId: { 
    type: DataTypes.UUID, 
    allowNull: false 
  },
  scoreTotal: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 0 
  },
  matchedSkills: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  missingSkills: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  missingMustHave: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  modelVersion: { 
    type: DataTypes.STRING(50), 
    allowNull: true 
  },
  status: { 
    type: DataTypes.ENUM('pending','success','error'), 
    defaultValue: 'success' 
  },
  errorMessage: { 
    type: DataTypes.STRING(1000), 
    allowNull: true 
  },
  generatedAt: { 
    type: DataTypes.DATE, 
    defaultValue: sequelize.literal('GETDATE()') 
  },
}, { 
  tableName: 'scores', 
  timestamps: false 
});

module.exports = Score;