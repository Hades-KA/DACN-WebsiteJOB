// server/src/models/Notification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Hoặc đường dẫn tới file config db của bạn

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'info',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Chúng ta tự định nghĩa 2 trường này
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true, // Để null cho an toàn, ta sẽ điền bằng Service
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'Notifications',
  timestamps: false, // ⛔ QUAN TRỌNG: Tắt tính năng tự động của Sequelize
});

module.exports = Notification;