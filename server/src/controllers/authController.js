const jwt = require('jsonwebtoken');
// const { User } = require('../models');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const bcrypt = require('bcryptjs');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register new user (mock version for testing)
const register = async (req, res) => {
  try {
    console.log('=== REGISTER REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Check validation results
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, company, userType } = req.body;

    // Mock user creation for testing
    const mockUser = await User.create({
      name,
      email,
      password,
      phone,
      company: userType === 'employer' ? company : null,
      userType,
    });


    // Generate token
    const token = generateToken(mockUser.id);

    res.status(201).json({
      message: 'User registered successfully',
      data: {
        user: mockUser,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Login user (mock version for testing)
const login = async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    // Kiểm tra lỗi đầu vào
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Tìm người dùng trong DB theo email
    const user = await User.findOne({ where: { email } });

    // Nếu không tìm thấy người dùng, trả về lỗi
    if (!user) {
      return res.status(400).json({
        message: 'Đăng nhập thất bại',
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // So sánh mật khẩu nhập và mật khẩu đã mã hóa trong DB
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Mật khẩu khớp:', isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: 'Đăng nhập thất bại',
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Lấy thông tin người dùng nếu mật khẩu khớp
    const mockUser = user.toJSON();
    console.log('Authenticated user:', mockUser);

    // Tạo token JWT
    const token = generateToken(mockUser.id);

    // Trả về thông tin người dùng và token
    res.json({
      message: 'Login successful',
      data: {
        user: mockUser,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


// Logout user
const logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'Profile retrieved successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, company } = req.body;
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      company: company || user.company
    });

    res.json({
      message: 'Profile updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile
};