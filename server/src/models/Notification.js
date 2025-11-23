// server/src/models/Notification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID của user nhận thông báo'
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'info',
    comment: 'Loại thông báo: info, success, warning, error'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Tiêu đề thông báo'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Nội dung ngắn'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Nội dung chi tiết (optional)'
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID công việc liên quan (nếu có)'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Đã đọc chưa'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    {
      name: 'idx_userId',
      fields: ['userId']
    },
    {
      name: 'idx_isRead',
      fields: ['isRead']
    },
    {
      name: 'idx_userId_isRead',
      fields: ['userId', 'isRead']
    }
  ]
});

module.exports = Notification;