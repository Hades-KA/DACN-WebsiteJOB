// server/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const getUserIdFromReq = (req) => req.user?.userId ?? req.user?.id ?? null;

const sanitizeUser = (u) => {
  const json = u?.toJSON ? u.toJSON() : u;
  if (!json) return json;
  delete json.password;
  delete json.resetPasswordToken;
  delete json.resetPasswordExpires;
  delete json.verificationToken;
  return json;
};

// ========== AUTH ==========
exports.register = async (req, res) => {
  try {
    // validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    let { name, email, password, phone, company, userType } = req.body || {};
    email = (email || '').trim().toLowerCase();
    userType = userType || 'candidate';

    // check duplicate email
    const existed = await User.findOne({ where: { email } });
    if (existed) {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }

    // hash password (không dựa vào hook để tránh rủi ro khi dùng raw)
    const hash = await bcrypt.hash(password, 12);

    // raw insert (tránh OUTPUT INSERTED; dùng GETDATE() để không lỗi DATETIME)
    const sql = `
      INSERT INTO [dbo].[users]
      ([id],[name],[email],[password],[phone],[userType],[company],[isActive],[isVerified],[createdAt],[updatedAt])
      VALUES (NEWID(), :name, :email, :password, :phone, :userType, :company, 1, 0, GETDATE(), GETDATE())
    `;

    await sequelize.query(sql, {
      replacements: {
        name,
        email,
        password: hash,
        phone: phone || null,
        userType,
        company: userType === 'employer' ? (company || null) : null,
      },
      type: QueryTypes.INSERT,
    });

    // select lại user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(500).json({ message: 'Registration failed', error: 'User not found right after insert' });
    }

    const token = generateToken(user.id);
    return res.status(201).json({
      message: 'User registered successfully',
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    console.error('Registration error:', error.original?.message || error.message);
    return res.status(500).json({
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development'
        ? (error.original?.message || error.message)
        : 'Internal server error',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: (email || '').toLowerCase() } });
    if (!user) return res.status(400).json({ message: 'Đăng nhập thất bại', error: 'Email hoặc mật khẩu không đúng' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Đăng nhập thất bại', error: 'Email hoặc mật khẩu không đúng' });

    const token = generateToken(user.id);
    return res.json({ message: 'Login successful', data: { user: sanitizeUser(user), token } });
  } catch (error) {
    console.error('Login error:', error.original?.message || error.message);
    return res.status(500).json({
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? (error.original?.message || error.message) : 'Internal server error',
    });
  }
};

exports.logout = async (_req, res) => {
  try {
    return res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// ========== PROFILE ==========
exports.getProfile = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const data = sanitizeUser(user);
    if (typeof data.skills === 'string' && data.skills) {
      data.skills = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    return res.json({ message: 'Profile retrieved successfully', data });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const {
      name, phone, company, position, location, about, skills, experience, education,
    } = req.body || {};

    let skillsCsv;
    if (Array.isArray(skills)) {
      skillsCsv = skills.map((s) => String(s).trim()).filter(Boolean).join(', ');
    } else if (typeof skills === 'string') {
      skillsCsv = skills;
    }

    const updates = {};
    if (typeof name !== 'undefined')        updates.name = name;
    if (typeof phone !== 'undefined')       updates.phone = phone;
    if (typeof company !== 'undefined')     updates.company = company;
    if (typeof position !== 'undefined')    updates.position = position;
    if (typeof location !== 'undefined')    updates.location = location;
    if (typeof about !== 'undefined')       updates.about = about;
    if (typeof experience !== 'undefined')  updates.experience = experience;
    if (typeof education !== 'undefined')   updates.education = education;
    if (typeof skillsCsv !== 'undefined')   updates.skills = skillsCsv;
    delete updates.email;

    try {
      await User.update(updates, {
        where: { id },
        returning: false,
        silent: true,
      });
    } catch (err) {
      console.warn('Model.update failed, fallback to raw SQL. Reason:', err?.original?.message || err.message);
      const fields = Object.keys(updates);
      const setParts = fields.map((k) => `[${k}] = :${k}`);
      setParts.push('[updatedAt] = GETDATE()');

      const sql = `UPDATE [users] SET ${setParts.join(', ')} WHERE [id] = :id`;
      await sequelize.query(sql, {
        replacements: { id, ...updates },
        type: QueryTypes.UPDATE,
      });
    }

    const fresh = await User.findByPk(id);
    if (!fresh) return res.status(404).json({ message: 'User not found after update' });

    const data = sanitizeUser(fresh);
    if (typeof data.skills === 'string' && data.skills) {
      data.skills = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    return res.json({ message: 'Profile updated successfully', data });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('DB detail:', error?.original?.message);
    return res.status(500).json({
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development'
        ? (error?.original?.message || error.message)
        : undefined,
    });
  }
};

// Helpers cho CV
const buildBaseUrl = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}`;
};

// POST /api/users/profile/cv
exports.uploadProfileCV = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file CV' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.cvUrl) {
      try {
        const currentName = user.cvUrl.split('/uploads/')[1];
        if (currentName) {
          const abs = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads', currentName);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch {}
    }

    const base = buildBaseUrl(req);
    const filename = path.basename(req.file.path);
    const cvUrl = `${base}/uploads/${filename}`;

    await User.update(
      { cvUrl, cvName: req.file.originalname, cvSize: req.file.size },
      { where: { id }, returning: false, silent: true }
    );

    return res.json({
      message: 'Tải lên CV thành công',
      data: { cvUrl, cvName: req.file.originalname, cvSize: req.file.size },
    });
  } catch (error) {
    console.error('Upload CV error:', error);
    return res.status(500).json({
      message: 'Upload CV failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// DELETE /api/users/profile/cv
exports.removeProfileCV = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.cvUrl) {
      try {
        const currentName = user.cvUrl.split('/uploads/')[1];
        if (currentName) {
          const abs = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads', currentName);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch {}
    }

    await User.update(
      { cvUrl: null, cvName: null, cvSize: null },
      { where: { id }, returning: false, silent: true }
    );

    return res.json({ message: 'Đã xóa CV' });
  } catch (error) {
    console.error('Remove CV error:', error);
    return res.status(500).json({
      message: 'Remove CV failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};