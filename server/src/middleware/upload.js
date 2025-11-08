// server/src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đường dẫn lưu file
const uploadRoot = process.env.UPLOAD_PATH
  ? path.isAbsolute(process.env.UPLOAD_PATH)
    ? process.env.UPLOAD_PATH
    : path.resolve(process.cwd(), process.env.UPLOAD_PATH)
  : path.resolve(process.cwd(), 'uploads');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `cv-${base}-${unique}${ext}`);
  },
});

// Lọc loại file
const fileFilter = (_req, file, cb) => {
  const allowed = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx')
    .split(',')
    .map((x) => '.' + x.trim().toLowerCase());
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  return cb(new Error(`File type ${ext} is not allowed. Allowed: ${allowed.join(', ')}`), false);
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB default
    files: 1,
  },
});

// Middleware xử lý lỗi upload
const handleUploadError = (error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File quá lớn. Tối đa 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Chỉ cho phép 1 file.' });
    }
  }
  if (error && error.message?.startsWith('File type')) {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
};

module.exports = { upload, handleUploadError };