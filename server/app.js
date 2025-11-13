const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const { sequelize, initDatabase } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 5001;

/* ============ Security (helmet + CORS) ============ */
// Helmet: cho phép nhúng tài nguyên khác origin (ảnh /uploads),
// tắt COEP để không chặn nhúng khi không cần.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

const defaultClientUrls = 'http://localhost:5175,http://127.0.0.1:5175';
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || defaultClientUrls)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Dev: cho phép tất cả
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Không được phép bởi CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

/* ============ Parsers, compression, log ============ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined'));

/* ============ Serve static uploads ============ */
const uploadRoot = process.env.UPLOAD_PATH
  ? (path.isAbsolute(process.env.UPLOAD_PATH) ? process.env.UPLOAD_PATH : path.resolve(process.cwd(), process.env.UPLOAD_PATH))
  : path.resolve(process.cwd(), 'uploads');

// Gắn header CORP cho /uploads để ảnh load cross-origin
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Cho phép FE dev truy cập ảnh; production có thể giới hạn theo allowedOrigins[0]
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.length) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  next();
}, express.static(uploadRoot));

/* ============ Health & DB test ============ */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/test-db', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ message: 'Kết nối SQL Server thành công!', status: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Kết nối SQL Server thất bại', error: error.message });
  }
});

/* ============ Routes ============ */
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/jobs', require('./src/routes/jobRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/companies', require('./src/routes/companyRoutes'));
app.use('/api/applications', require('./src/routes/applicationRoutes'));
app.use('/api/cvs', require('./src/routes/cvRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/files', require('./src/routes/fileRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/saved-jobs', require('./src/routes/savedJobRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

/* ============ Error handler & 404 ============ */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Đường dẫn không tồn tại' });
});

/* ============ Start ============ */
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
      console.log(`📊 Kiểm tra sức khỏe: http://localhost:${PORT}/health`);
      console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Uploads served at /uploads from: ${uploadRoot}`);
    });
  } catch (error) {
    console.error('❌ Server không khởi động được:', error);
  }
};
startServer();

module.exports = app;