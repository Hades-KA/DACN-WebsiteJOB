// server/src/controllers/authController.js
'use strict';

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/* ============ helpers ============ */
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', {
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

const devMsg = (e) => (process.env.NODE_ENV === 'development' ? (e?.original?.message || e?.message) : undefined);
const buildBaseUrl = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}`;
};

/* ============ AUTH ============ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    let { name, email, password, phone, company, userType } = req.body || {};
    email = (email || '').trim().toLowerCase();
    userType = userType || 'candidate';

    const existed = await User.findOne({ where: { email } });
    if (existed) return res.status(409).json({ message: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 12);

    // Raw insert để đảm bảo default/time
    await sequelize.query(
      `INSERT INTO [dbo].[users]
       ([id],[name],[email],[password],[phone],[userType],[company],[isActive],[isVerified],[createdAt],[updatedAt])
       VALUES (NEWID(), :name, :email, :password, :phone, :userType, :company, 1, 0, GETDATE(), GETDATE())`,
      {
        replacements: {
          name,
          email,
          password: hash,
          phone: phone || null,
          userType,
          company: userType === 'employer' ? (company || null) : null,
        },
        type: QueryTypes.INSERT,
      }
    );

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(500).json({ message: 'Registration failed', error: 'User not found right after insert' });

    const token = generateToken(user.id);
    return res.status(201).json({
      message: 'User registered successfully',
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    console.error('Registration error:', error?.original?.message || error.message);
    return res.status(500).json({
      message: 'Registration failed',
      error: devMsg(error),
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body || {};
    const user = await User.findOne({ where: { email: (email || '').toLowerCase() } });
    if (!user) return res.status(400).json({ message: 'Đăng nhập thất bại', error: 'Email hoặc mật khẩu không đúng' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Đăng nhập thất bại', error: 'Email hoặc mật khẩu không đúng' });

    const token = generateToken(user.id);
    return res.json({ message: 'Login successful', data: { user: sanitizeUser(user), token } });
  } catch (error) {
    console.error('Login error:', error?.original?.message || error.message);
    return res.status(500).json({
      message: 'Login failed',
      error: devMsg(error),
    });
  }
};

exports.logout = async (_req, res) => {
  try {
    return res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Logout failed', error: devMsg(error) });
  }
};

/* ============ PROFILE (Hồ sơ của tôi) ============ */
// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    // Lấy đầy đủ cột (kể cả cột mới) bằng raw SQL
    const [u] = await sequelize.query(
      `SELECT TOP 1
         id, name, email, phone, userType,
         position, location, about, skills, experience, education,
         [level], workType, degree, industry, jobCategory, experienceBand, expectedSalary,
         birthdate, [address], gender, maritalStatus, jobAlertOn, careerGoals,
         cvUrl, cvName, cvSize, createdAt, updatedAt
       FROM dbo.users WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!u) return res.status(404).json({ message: 'User not found' });

    // Chuẩn hóa skills: parse JSON nếu có, nếu không thì CSV -> array
    let outSkills = u.skills;
    if (typeof outSkills === 'string' && outSkills) {
      try {
        const parsed = JSON.parse(outSkills);
        outSkills = parsed;
      } catch {
        outSkills = outSkills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (outSkills == null) {
      outSkills = [];
    }

    return res.json({
      message: 'Profile retrieved successfully',
      data: { ...u, skills: outSkills, jobAlertOn: Boolean(u.jobAlertOn) },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      message: 'Failed to get profile',
      error: devMsg(error),
    });
  }
};

// PATCH /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    // Nhận field theo UI mới
    const {
      firstName, lastName,
      name, phone, company, position, location, about, experience, education,
      level, workType, degree, industry, jobCategory, experienceBand, expectedSalary,
      birthdate, address, gender, maritalStatus, jobAlertOn, careerGoals,
      skills
    } = req.body || {};

    // Ghép họ tên nếu có
    const fullName = (name || [firstName, lastName].filter(Boolean).join(' ').trim()) || undefined;

    // Chuẩn hóa skills
    let skillsValue;
    if (typeof skills !== 'undefined') {
      if (Array.isArray(skills)) {
        skillsValue = JSON.stringify(skills); // [{name,level}] hoặc ['JS','React']
      } else if (typeof skills === 'object' && skills) {
        skillsValue = JSON.stringify(skills);
      } else if (typeof skills === 'string') {
        // Giữ CSV để tương thích cũ
        skillsValue = skills;
      } else {
        skillsValue = null;
      }
    }

    // Build updates
    const updates = {};
    if (typeof fullName !== 'undefined')        updates.name = fullName;
    if (typeof phone !== 'undefined')           updates.phone = phone;
    if (typeof company !== 'undefined')         updates.company = company;
    if (typeof position !== 'undefined')        updates.position = position;
    if (typeof location !== 'undefined')        updates.location = location;
    if (typeof about !== 'undefined')           updates.about = about;
    if (typeof experience !== 'undefined')      updates.experience = experience;
    if (typeof education !== 'undefined')       updates.education = education;

    if (typeof level !== 'undefined')           updates.level = level;
    if (typeof workType !== 'undefined')        updates.workType = workType;
    if (typeof degree !== 'undefined')          updates.degree = degree;
    if (typeof industry !== 'undefined')        updates.industry = industry;
    if (typeof jobCategory !== 'undefined')     updates.jobCategory = jobCategory;
    if (typeof experienceBand !== 'undefined')  updates.experienceBand = experienceBand;

    if (typeof expectedSalary !== 'undefined')  updates.expectedSalary = expectedSalary === '' ? null : Number(expectedSalary);

    if (typeof birthdate !== 'undefined')       updates.birthdate = birthdate || null;
    if (typeof address !== 'undefined')         updates.address = address;
    if (typeof gender !== 'undefined')          updates.gender = gender;
    if (typeof maritalStatus !== 'undefined')   updates.maritalStatus = maritalStatus;

    if (typeof jobAlertOn !== 'undefined')      updates.jobAlertOn = jobAlertOn ? 1 : 0;
    if (typeof careerGoals !== 'undefined')     updates.careerGoals = careerGoals;

    if (typeof skillsValue !== 'undefined')     updates.skills = skillsValue;

    // Không cho đổi email ở endpoint này
    delete updates.email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu cập nhật' });
    }

    // Raw UPDATE (khỏi phụ thuộc model đủ cột)
    const fields = Object.keys(updates);
    const setParts = fields.map((k, i) => `[${k}] = :v${i}`);
    setParts.push('[updatedAt] = GETDATE()');

    const repl = { id };
    fields.forEach((k, i) => { repl[`v${i}`] = updates[k]; });

    await sequelize.query(
      `UPDATE [dbo].[users] SET ${setParts.join(', ')} WHERE [id] = :id`,
      { replacements: repl, type: QueryTypes.UPDATE }
    );

    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      message: 'Failed to update profile',
      error: devMsg(error),
    });
  }
};

/* ============ CV Profile (giữ nguyên style hiện có) ============ */
// POST /api/users/profile/cv  (multer cần gắn ở route)
exports.uploadProfileCV = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file CV' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Nếu đang có CV cũ: xóa file cũ (nếu nằm trong /uploads)
    if (user.cvUrl) {
      try {
        const afterUploads = user.cvUrl.split('/uploads/')[1];
        if (afterUploads) {
          const abs = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads', afterUploads);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch {}
    }

    // Tạo URL public cho file mới ngay dưới /uploads
    const base = buildBaseUrl(req);
    const filename = path.basename(req.file.path); // giả định lưu vào uploads/<filename>
    const cvUrl = `${base}/uploads/${filename}`;

    await User.update(
      { cvUrl, cvName: req.file.originalname, cvSize: req.file.size },
      { where: { id }, returning: false, silent: true }
    );

    return res.status(201).json({
      message: 'Tải lên CV thành công',
      data: { cvUrl, cvName: req.file.originalname, cvSize: req.file.size },
    });
  } catch (error) {
    console.error('Upload CV error:', error);
    return res.status(500).json({
      message: 'Upload CV failed',
      error: devMsg(error),
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
        const afterUploads = user.cvUrl.split('/uploads/')[1];
        if (afterUploads) {
          const abs = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads', afterUploads);
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
      error: devMsg(error),
    });
  }
};