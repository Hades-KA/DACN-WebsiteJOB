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
  salaryBand: { type: DataTypes.STRING(50), allowNull: true },         // 'Dưới 5 triệu' | '5-10 triệu' | '10-20 triệu' | 'Trên 20 triệu'

  type: { type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'intern'), allowNull: false, defaultValue: 'full-time' },
  workMode: { type: DataTypes.STRING(20), allowNull: true },            // 'onsite' | 'hybrid' | 'remote'

  // Hiển thị tự do (text)
  experience: { type: DataTypes.STRING(50), allowNull: true },
  // Lọc theo band
  experienceBand: { type: DataTypes.STRING(50), allowNull: true },      // 'Dưới 1 năm' | '1-3 năm' | ...

  level: { type: DataTypes.STRING(50), allowNull: true },               // 'Thực tập sinh' | 'Nhân viên' | ...
  education: { type: DataTypes.STRING(50), allowNull: true },           // 'THPT' | 'Cao đẳng' | ...

  description: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 5000] } },
  requirements: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true, len: [1, 3000] } },
  benefits: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },

  skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },

  deadline: { type: DataTypes.DATEONLY, allowNull: true },              // hạn nộp
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