// server/src/models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

  name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true, len: [2, 100] } },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false, validate: { len: [6, 255] } },

  phone: { type: DataTypes.STRING(20), allowNull: true },
  userType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'candidate' },

  company:   { type: DataTypes.STRING(255), allowNull: true },
  avatar:    { type: DataTypes.STRING(500), allowNull: true },
  isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
  isVerified:{ type: DataTypes.BOOLEAN, defaultValue: false },
  lastLogin: { type: DataTypes.DATE, allowNull: true },

  resetPasswordToken:   { type: DataTypes.STRING(255), allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE,        allowNull: true },
  verificationToken:    { type: DataTypes.STRING(255), allowNull: true },

  // Hồ sơ ứng viên
  position:   { type: DataTypes.STRING(255), allowNull: true },
  location:   { type: DataTypes.STRING(255), allowNull: true },
  about:      { type: DataTypes.TEXT,        allowNull: true },
  skills:     { type: DataTypes.TEXT,        allowNull: true },
  experience: { type: DataTypes.TEXT,        allowNull: true },
  education:  { type: DataTypes.TEXT,        allowNull: true },

  // Metadata CV
  cvUrl:  { type: DataTypes.STRING(500), allowNull: true },
  cvName: { type: DataTypes.STRING(255), allowNull: true },
  cvSize: { type: DataTypes.INTEGER,     allowNull: true },

  // Hồ sơ công ty (employer)
  companyWebsite:  { type: DataTypes.STRING(255), allowNull: true },
  companySize:     { type: DataTypes.STRING(50),  allowNull: true },
  industry:        { type: DataTypes.STRING(100), allowNull: true },
  taxCode:         { type: DataTypes.STRING(50),  allowNull: true },
  businessLicense: { type: DataTypes.STRING(100), allowNull: true },
  companyCity:     { type: DataTypes.STRING(100), allowNull: true },
  companyAddress:  { type: DataTypes.STRING(255), allowNull: true },
  logoUrl:         { type: DataTypes.STRING(500), allowNull: true },
  companyAbout:    { type: DataTypes.TEXT,        allowNull: true },

}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

User.addHook('beforeCreate', async (user) => {
  if (user.password) user.password = await bcrypt.hash(user.password, 12);
});
User.addHook('beforeUpdate', async (user) => {
  if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  delete values.verificationToken;
  return values;
};

module.exports = User;