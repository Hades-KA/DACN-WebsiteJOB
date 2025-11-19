const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

  title: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
  company: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
  location: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },

  // Hiển thị tự do (text)
  salary: { type: DataTypes.STRING(100), allowNull: true },
  // Lọc theo band
  salaryBand: { type: DataTypes.STRING(50), allowNull: true },

  type: { type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'intern'), allowNull: false, defaultValue: 'full-time' },
  workMode: { type: DataTypes.STRING(20), allowNull: true },

  // Hiển thị tự do (text)
  experience: { type: DataTypes.STRING(50), allowNull: true },
  // Lọc theo band
  experienceBand: { type: DataTypes.STRING(50), allowNull: true },

  level: { type: DataTypes.STRING(50), allowNull: true },
  education: { type: DataTypes.STRING(50), allowNull: true },

  description: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 5000] } },
  requirements: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 3000] } },
  benefits: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },

  skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },

  deadline: { type: DataTypes.DATEONLY, allowNull: true },
  headcount: { type: DataTypes.INTEGER, allowNull: true },

  // Liên hệ (override company)
  contactName: { type: DataTypes.STRING(255), allowNull: true },
  contactEmail: { type: DataTypes.STRING(255), allowNull: true },
  contactPhone: { type: DataTypes.STRING(50), allowNull: true },
  contactAddress: { type: DataTypes.STRING(255), allowNull: true },

  // Hiển thị & nổi bật
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },

  applicationsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewsCount: { type: DataTypes.INTEGER, defaultValue: 0 },

  employerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },

  jobCode: { type: DataTypes.STRING(50), allowNull: true },

  // 🆕 4 TRƯỜNG MỚI CHO AI SCORING
  jdText: { type: DataTypes.TEXT, allowNull: true },
  mustHaveSkills: { type: DataTypes.TEXT, allowNull: true }, // JSON string
  niceToHaveSkills: { type: DataTypes.TEXT, allowNull: true }, // JSON string
  jdVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

  createdAt: { type: DataTypes.DATE, allowNull: true },
  updatedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'jobs',
  timestamps: false,
  indexes: [
    { fields: ['category'] },
    { fields: ['location'] },
    { fields: ['type'] },
    { fields: ['isActive'] },
    { fields: ['employerId'] },
    { fields: ['level'] },
    { fields: ['education'] },
    { fields: ['experienceBand'] },
    { fields: ['salaryBand'] },
  ]
});

module.exports = Job;