// server/src/models/Application.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Trạng thái đơn
  status: {
    type: DataTypes.ENUM('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },

  // Nội dung đơn
  coverLetter: { type: DataTypes.TEXT, allowNull: true },
  expectedSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  availableFrom: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },

  // AI (giữ nguyên)
  aiMatchScore: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    validate: { min: 0, max: 10 }
  },
  aiAnalysis: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  isAnalyzed: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Khóa ngoại
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'jobs', key: 'id' }
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  cvId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'cvs', key: 'id' }
  },

  // ====== NEW: phục vụ nhà tuyển dụng xem đúng hồ sơ tại thời điểm nộp ======
  // Lưu JSON string snapshot hồ sơ: {name,email,phone,position,location,about,skills,experience,education,avatar,...}
  candidateSnapshot: { type: DataTypes.TEXT, allowNull: true },

  // Metadata CV để tải nhanh khi employer xem
  cvName: { type: DataTypes.STRING(255), allowNull: true },
  cvFilePath: { type: DataTypes.STRING(500), allowNull: true },

  // Lịch sử thay đổi trạng thái (JSON string, mặc định '[]')
  statusHistory: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },

  // Thời gian
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'applications',
  timestamps: false,
  indexes: [
    { fields: ['status'] },
    { fields: ['jobId'] },
    { fields: ['candidateId'] },
    { fields: ['aiMatchScore'] },
    { unique: true, fields: ['jobId', 'candidateId'] }
  ]
});

module.exports = Application;