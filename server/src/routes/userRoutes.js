const express = require('express');
const { body } = require('express-validator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  getProfile,
  updateProfile,
  uploadProfileCV,
  removeProfileCV,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* ============ CẤU HÌNH UPLOAD CV ============ */
const uploadRoot = process.env.UPLOAD_PATH
  ? (path.isAbsolute(process.env.UPLOAD_PATH)
      ? process.env.UPLOAD_PATH
      : path.resolve(process.cwd(), process.env.UPLOAD_PATH))
  : path.resolve(process.cwd(), 'uploads');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

// Chỉ cho phép PDF, DOC, DOCX
const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Chỉ hỗ trợ file PDF, DOC, DOCX'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ============ MIDDLEWARE: tất cả route phía dưới phải đăng nhập ============ */
router.use(auth);

/* ============ VALIDATION UPDATE PROFILE ============ */
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
    .withMessage('Company name must be between 2 and 255 characters'),
];

/* ============ ROUTES ============ */

// Lấy thông tin hồ sơ
// GET /api/users/profile
router.get('/profile', getProfile);

// Cập nhật hồ sơ (thông tin cá nhân, kinh nghiệm, kỹ năng,...)
// PUT /api/users/profile
router.put('/profile', updateProfileValidation, updateProfile);

// Cho phép FE dùng PATCH /api/users/profile
router.patch('/profile', updateProfileValidation, updateProfile);

// Upload / cập nhật CV trong hồ sơ
// FE đang gọi: POST /api/users/profile/cv
router.post(
  '/profile/cv',
  upload.any(), // nhận file với mọi tên field
  (req, res, next) => {
    // Chuyển từ req.files sang req.file cho hàm controller dùng
    if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    return uploadProfileCV(req, res, next);
  }
);

// Xóa CV trong hồ sơ
// DELETE /api/users/profile/cv
router.delete('/profile/cv', removeProfileCV);

module.exports = router;