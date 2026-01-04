const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logosRoot = path.resolve(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(logosRoot)) fs.mkdirSync(logosRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `logo-${base}-${unique}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ok = ['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'].includes(file.mimetype);
  if (ok) return cb(null, true);
  return cb(new Error('Only image files (png/jpg/jpeg/webp/svg) are allowed'), false);
};

const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 } // 2MB
});

const handleUploadError = (err, _req, res, next) => {
  if (err) return res.status(400).json({ message: err.message || 'Upload error' });
  return next();
};

module.exports = { uploadLogo, handleUploadError };