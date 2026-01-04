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
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

/* ============ Helpers ============ */
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

const devMsg = (e) =>
  process.env.NODE_ENV === 'development'
    ? e?.original?.message || e?.message
    : undefined;

const buildBaseUrl = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}`;
};

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5175';

/* ============ Auth ============ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    let { name, email, password, phone, company, userType } = req.body || {};
    email = (email || '').trim().toLowerCase();
    userType = userType || 'candidate';

    const existed = await User.findOne({ where: { email } });
    if (existed) return res.status(409).json({ message: 'Email đã tồn tại' });

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    await sequelize.query(
      `INSERT INTO [dbo].[users]
       ([id],[name],[email],[password],[phone],[userType],[company],[isActive],[isVerified],[verificationToken],[createdAt],[updatedAt])
       VALUES (NEWID(), :name, :email, :password, :phone, :userType, :company, 1, 0, :verificationToken, GETDATE(), GETDATE())`,
      {
        replacements: {
          name,
          email,
          password: hash,
          phone: phone || null,
          userType,
          company: userType === 'employer' ? company || null : null,
          verificationToken: verifyToken,
        },
        type: QueryTypes.INSERT,
      }
    );

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(500).json({ message: 'Registration failed' });

    const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verifyToken}`;
    await sendMail({
      to: user.email,
      subject: 'Xác thực tài khoản JobHire',
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color:#2563eb">Chào ${user.name}!</h2>
          <p>Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản:</p>
          <p>
            <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
              Xác thực email
            </a>
          </p>
          <p>Nếu không bấm được, copy link: ${verifyUrl}</p>
        </div>
      `,
    });

    const token = generateToken(user.id);
    return res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.',
      data: { user: sanitizeUser(user), token },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed', error: devMsg(error) });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { email, password } = req.body || {};
    const user = await User.findOne({ where: { email: (email || '').toLowerCase() } });
    if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });

    const token = generateToken(user.id);
    return res.json({ message: 'Login successful', data: { user: sanitizeUser(user), token } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed', error: devMsg(error) });
  }
};

exports.logout = async (_req, res) => {
  return res.json({ message: 'Logout successful' });
};

/* ============ Profile ============ */
exports.getProfile = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const [u] = await sequelize.query(
      `SELECT TOP 1
         id, name, email, phone, userType, company,
         position, location, about, skills, experience, education,
         [level], workType, degree, industry, jobCategory, experienceBand, expectedSalary,
         birthdate, [address], gender, maritalStatus, jobAlertOn, careerGoals,
         cvUrl, cvName, cvSize, isVerified, createdAt, updatedAt
       FROM dbo.users WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!u) return res.status(404).json({ message: 'User not found' });

    let outSkills = u.skills;
    if (typeof outSkills === 'string' && outSkills) {
      try { outSkills = JSON.parse(outSkills); }
      catch { outSkills = outSkills.split(',').map((s) => s.trim()).filter(Boolean); }
    } else if (outSkills == null) {
      outSkills = [];
    }

    return res.json({
      message: 'Profile retrieved successfully',
      data: { ...u, skills: outSkills, jobAlertOn: Boolean(u.jobAlertOn), isVerified: Boolean(u.isVerified) },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Failed to get profile', error: devMsg(error) });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const {
      firstName, lastName, name, phone, company, position, location, about,
      experience, education, level, workType, degree, industry, jobCategory,
      experienceBand, expectedSalary, birthdate, address, gender, maritalStatus,
      jobAlertOn, careerGoals, skills,
    } = req.body || {};

    const fullName =
      name || [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;

    let skillsValue;
    if (typeof skills !== 'undefined') {
      if (Array.isArray(skills)) skillsValue = JSON.stringify(skills);
      else if (typeof skills === 'object' && skills) skillsValue = JSON.stringify(skills);
      else if (typeof skills === 'string') skillsValue = skills;
      else skillsValue = null;
    }

    const updates = {};
    if (typeof fullName !== 'undefined') updates.name = fullName;
    if (typeof phone !== 'undefined') updates.phone = phone;
    if (typeof company !== 'undefined') updates.company = company;
    if (typeof position !== 'undefined') updates.position = position;
    if (typeof location !== 'undefined') updates.location = location;
    if (typeof about !== 'undefined') updates.about = about;
    if (typeof experience !== 'undefined') updates.experience = experience;
    if (typeof education !== 'undefined') updates.education = education;

    if (typeof level !== 'undefined') updates.level = level;
    if (typeof workType !== 'undefined') updates.workType = workType;
    if (typeof degree !== 'undefined') updates.degree = degree;
    if (typeof industry !== 'undefined') updates.industry = industry;
    if (typeof jobCategory !== 'undefined') updates.jobCategory = jobCategory;
    if (typeof experienceBand !== 'undefined') updates.experienceBand = experienceBand;

    if (typeof expectedSalary !== 'undefined')
      updates.expectedSalary = expectedSalary === '' ? null : Number(expectedSalary);

    if (typeof birthdate !== 'undefined') updates.birthdate = birthdate || null;
    if (typeof address !== 'undefined') updates.address = address;
    if (typeof gender !== 'undefined') updates.gender = gender;
    if (typeof maritalStatus !== 'undefined') updates.maritalStatus = maritalStatus;

    if (typeof jobAlertOn !== 'undefined') updates.jobAlertOn = jobAlertOn ? 1 : 0;
    if (typeof careerGoals !== 'undefined') updates.careerGoals = careerGoals;
    if (typeof skillsValue !== 'undefined') updates.skills = skillsValue;

    delete updates.email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu cập nhật' });
    }

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
    return res.status(500).json({ message: 'Failed to update profile', error: devMsg(error) });
  }
};

/* ============ CV Profile ============ */
exports.uploadProfileCV = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const file = req.file || (Array.isArray(req.files) && req.files[0]);
    if (!file) return res.status(400).json({ message: 'Vui lòng chọn file CV' });

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

    const base = buildBaseUrl(req);
    const filename = path.basename(file.path);
    const cvUrl = `${base}/uploads/${filename}`;

    await User.update(
      { cvUrl, cvName: file.originalname, cvSize: file.size },
      { where: { id }, returning: false, silent: true }
    );

    return res.status(201).json({
      message: 'Tải lên CV thành công',
      data: { cvUrl, cvName: file.originalname, cvSize: file.size },
    });
  } catch (error) {
    console.error('Upload CV error:', error);
    return res.status(500).json({ message: 'Upload CV failed', error: devMsg(error) });
  }
};

exports.removeProfileCV = async (req, res) => {
  try {
    const id = getUserIdFromReq(req);
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.cvUrl) {
      try {
        const afterUploads = user.cvUrl.split('/uploads/')[1];
        const abs = afterUploads && path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads', afterUploads);
        if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {}
    }

    await User.update(
      { cvUrl: null, cvName: null, cvSize: null },
      { where: { id }, returning: false, silent: true }
    );

    return res.json({ message: 'Đã xóa CV' });
  } catch (error) {
    console.error('Remove CV error:', error);
    return res.status(500).json({ message: 'Remove CV failed', error: devMsg(error) });
  }
};

/* ============ Forgot / Reset Password ============ */
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc' });

    const [user] = await sequelize.query(
      `SELECT TOP 1 id, name, email FROM dbo.users WHERE LOWER(email) = LOWER(:email)`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');

      await sequelize.query(
        `UPDATE dbo.users
         SET resetPasswordToken = :token,
             resetPasswordExpires = DATEADD(MINUTE, 15, GETUTCDATE()),
             updatedAt = GETUTCDATE()
         WHERE id = :id`,
        { replacements: { token: resetToken, id: user.id }, type: QueryTypes.UPDATE }
      );

      const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
      await sendMail({
        to: user.email,
        subject: 'Đặt lại mật khẩu',
        html: `
          <h2>Yêu cầu đặt lại mật khẩu</h2>
          <p>Chào ${user.name || 'bạn'},</p>
          <p>Vui lòng dùng liên kết sau để đặt lại mật khẩu (hiệu lực 15 phút):</p>
          <p><a href="${resetUrl}" target="_blank" rel="noopener">Đặt lại mật khẩu</a></p>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        `,
      });
    }

    return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Lỗi xử lý yêu cầu', error: devMsg(error) });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ message: 'Token là bắt buộc' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });

    const [user] = await sequelize.query(
      `SELECT TOP 1 
        id, email, resetPasswordExpires,
        CASE WHEN resetPasswordExpires > GETUTCDATE() THEN 1 ELSE 0 END as isValidToken
       FROM dbo.users 
       WHERE resetPasswordToken = :token`,
      { replacements: { token: token.trim() }, type: QueryTypes.SELECT }
    );

    if (!user) return res.status(400).json({ message: 'Token không hợp lệ' });
    if (!user.isValidToken) return res.status(400).json({ message: 'Token đã hết hạn. Vui lòng yêu cầu link mới.' });

    const hash = await bcrypt.hash(password, 12);

    await sequelize.query(
      `UPDATE dbo.users 
       SET password = :password,
           resetPasswordToken = NULL,
           resetPasswordExpires = NULL,
           updatedAt = GETUTCDATE()
       WHERE id = :id`,
      { replacements: { password: hash, id: user.id }, type: QueryTypes.UPDATE }
    );

    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu', error: devMsg(error) });
  }
};

/* ============ Verify email / Resend ============ */
exports.verifyEmail = async (req, res) => {
  try {
    const token = (req.query.token || '').trim();
    if (!token) return res.status(400).json({ message: 'Token là bắt buộc' });

    const [user] = await sequelize.query(
      `SELECT TOP 1 id, email, isVerified 
       FROM dbo.users 
       WHERE verificationToken = :token`,
      { replacements: { token }, type: QueryTypes.SELECT }
    );

    if (!user) return res.status(400).json({ message: 'Token không hợp lệ' });
    if (user.isVerified) return res.json({ message: 'Tài khoản đã được xác thực trước đó' });

    await sequelize.query(
      `UPDATE dbo.users 
       SET isVerified = 1,
           verificationToken = NULL,
           updatedAt = GETUTCDATE()
       WHERE id = :id`,
      { replacements: { id: user.id }, type: QueryTypes.UPDATE }
    );

    return res.json({ message: 'Xác thực email thành công' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Lỗi xác thực email', error: devMsg(error) });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc' });

    const [user] = await sequelize.query(
      `SELECT TOP 1 id, name, email, isVerified 
       FROM dbo.users 
       WHERE LOWER(email) = LOWER(:email)`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );

    if (!user) return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi lại mã xác thực.' });
    if (user.isVerified) return res.status(400).json({ message: 'Tài khoản đã được xác thực' });

    const verifyToken = crypto.randomBytes(32).toString('hex');

    await sequelize.query(
      `UPDATE dbo.users 
       SET verificationToken = :token,
           updatedAt = GETUTCDATE()
       WHERE id = :id`,
      { replacements: { token: verifyToken, id: user.id }, type: QueryTypes.UPDATE }
    );

    const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verifyToken}`;
    await sendMail({
      to: user.email,
      subject: 'Xác thực tài khoản của bạn',
      html: `
        <h2>Xác thực tài khoản</h2>
        <p>Chào ${user.name || 'bạn'},</p>
        <p>Vui lòng bấm vào liên kết sau để xác thực tài khoản:</p>
        <p><a href="${verifyUrl}" target="_blank" rel="noopener">Xác thực email</a></p>
        <p>Hoặc copy link này: ${verifyUrl}</p>
      `,
    });

    return res.json({ message: 'Đã gửi lại email xác thực' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Lỗi gửi lại email xác thực', error: devMsg(error) });
  }
};