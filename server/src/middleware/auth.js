// auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Sequelize model User
require('dotenv').config();

/**
 * Middleware xác thực JWT và gán user vào req
 */
const auth = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Giải mã token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    if (!decoded.userId) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    // Lấy user thực từ database
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive.' });
    }

    // Gán user info vào req
    req.user = {
      userId: user.id,
      userType: user.userType, // 'candidate', 'employer', 'admin'
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

/**
 * Middleware kiểm tra quyền employer
 */
const requireEmployer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });

  if (req.user.userType !== 'employer' && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Employer privileges required.' });
  }

  next();
};

/**
 * Middleware kiểm tra quyền admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized.' });

  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

/**
 * Hàm tạo JWT khi login
 * @param {Object} user - Sequelize User instance
 * @returns {String} token
 */
const generateToken = (user) => {
  const payload = { userId: user.id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }); // token 7 ngày
  return token;
};

module.exports = {
  auth,
  requireEmployer,
  requireAdmin,
  generateToken
};
