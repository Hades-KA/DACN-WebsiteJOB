// server/src/routes/userRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  uploadProfileCV,
  removeProfileCV,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

router.use(auth);

const updateProfileValidation = [
  body('name').optional().isString().trim(),
  body('phone').optional().isString().trim(),
  body('position').optional().isString(),
  body('location').optional().isString(),
  body('about').optional().isString(),
  body('skills').optional().custom(v => Array.isArray(v) || typeof v === 'string'),
  body('experience').optional().isString(),
  body('education').optional().isString(),
  body('company').optional().isString(),
];

router.get('/profile', getProfile);
router.patch('/profile', updateProfileValidation, updateProfile);
router.put('/profile', updateProfileValidation, updateProfile);

// Upload/xóa CV hồ sơ cá nhân
router.post('/profile/cv', upload.single('cv'), handleUploadError, uploadProfileCV);
router.delete('/profile/cv', removeProfileCV);

module.exports = router;