const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SavedJob = sequelize.define('SavedJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'jobs', key: 'id' }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'saved_jobs',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['userId', 'jobId'] }
  ]
});

module.exports = SavedJob;
