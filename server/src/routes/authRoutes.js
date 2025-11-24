// server/src/routes/authRoutes.js
const express = require('express');
const { body, query } = require('express-validator');
const {
  register, login, logout,
  getProfile, updateProfile,
  uploadProfileCV, removeProfileCV,
  forgotPassword, resetPassword,
  verifyEmail, resendVerification,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_PATH || 'uploads'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|doc|docx/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only .pdf, .doc, .docx files are allowed'), ok);
  }
});

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').optional().isMobilePhone('any'),
  body('userType').isIn(['candidate', 'employer']),
  body('company').if(body('userType').equals('employer')).trim().isLength({ min: 2, max: 255 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().isMobilePhone('any'),
  body('company').optional().isLength({ min: 2, max: 255 }),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', auth, logout);

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.patch('/profile', auth, updateProfileValidation, updateProfile);

router.post('/profile/cv', auth, upload.single('cv'), uploadProfileCV);
router.delete('/profile/cv', auth, removeProfileCV);

router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 6 })], resetPassword);
router.get('/verify-email', [query('token').notEmpty()], verifyEmail);
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], resendVerification);

router.get('/me', auth, (req, res) => {
  res.json({
    message: 'OK',
    data: { id: req.user.userId, email: req.user.email, userType: req.user.userType },
  });
});

module.exports = router;