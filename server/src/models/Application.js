// server/src/models/Application.js
const { DataTypes } = require('sequelize');
// 👇 Đảm bảo đường dẫn tới file config DB là đúng
const { sequelize } = require('../config/database'); 

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  // Trạng thái đơn: Dùng STRING cho linh hoạt, tránh lỗi ENUM của một số phiên bản SQL
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending'
  },

  // Nội dung đơn
  coverLetter: { type: DataTypes.TEXT, allowNull: true },
  expectedSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: true }, // Tăng độ chính xác lương
  
  // availableFrom: Dùng DATEONLY để chỉ lưu ngày YYYY-MM-DD, tránh lỗi múi giờ
  availableFrom: { type: DataTypes.DATEONLY, allowNull: true }, 
  
  notes: { type: DataTypes.TEXT, allowNull: true },

  // AI Match Score
  aiMatchScore: {
    type: DataTypes.DECIMAL(4, 1), // 0.0 -> 100.0 hoặc 0.0 -> 10.0 tùy logic
    allowNull: true
  },
  aiAnalysis: { type: DataTypes.TEXT, allowNull: true }, // Lưu JSON string cho an toàn
  isAnalyzed: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Khóa ngoại
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  cvId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  // Snapshot & Meta
  candidateSnapshot: { type: DataTypes.TEXT, allowNull: true },
  cvName: { type: DataTypes.STRING(255), allowNull: true },
  cvFilePath: { type: DataTypes.STRING(500), allowNull: true },
  statusHistory: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },

  // ⭐ FIX QUAN TRỌNG: Tự định nghĩa createdAt/updatedAt dùng GETDATE()
  // Để tránh lỗi "Conversion failed" của SQL Server
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
  tableName: 'Applications',
  timestamps: false, // ⛔ TẮT TỰ ĐỘNG TIMESTAMP CỦA SEQUELIZE
  indexes: [
    { fields: ['status'] },
    { fields: ['jobId'] },
    { fields: ['candidateId'] },
    { unique: true, fields: ['jobId', 'candidateId'] } // Chống spam apply nhiều lần
  ]
});

module.exports = Application;