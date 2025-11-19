const express = require('express');
const { body, query } = require('express-validator');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  uploadProfileCV,
  removeProfileCV,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer config for CV upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .pdf, .doc, .docx files are allowed'));
  }
});

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').optional().isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('userType').isIn(['candidate', 'employer']).withMessage('User type must be either candidate or employer'),
  body('company')
    .if(body('userType').equals('employer'))
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('company').optional().isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters'),
];

// Auth routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', auth, logout);

// Profile routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.patch('/profile', auth, updateProfileValidation, updateProfile);

// CV routes
router.post('/profile/cv', auth, upload.single('cv'), uploadProfileCV);
router.delete('/profile/cv', auth, removeProfileCV);

// Email verification + password reset
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 6 })], resetPassword);
router.get('/verify-email', [query('token').notEmpty()], verifyEmail);
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], resendVerification);

// Lightweight endpoint to fetch current auth info
router.get('/me', auth, (req, res) => {
  res.json({
    message: 'OK',
    data: {
      id: req.user.userId,
      email: req.user.email,
      userType: req.user.userType,
    },
  });
});

module.exports = router;