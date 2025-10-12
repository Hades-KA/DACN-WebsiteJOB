const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getProfile, updateProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('userType')
    .isIn(['candidate', 'employer'])
    .withMessage('User type must be either candidate or employer'),
  body('company')
    .if(body('userType').equals('employer')) // Chỉ validate nếu userType là employer
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('company')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', auth, logout);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);

module.exports = router;