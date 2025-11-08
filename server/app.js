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

// Bảo mật
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5175')
  .split(',')
  .map(o => o.trim());
const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Không được phép bởi CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined'));

// Serve files tĩnh cho uploads
const uploadRoot = process.env.UPLOAD_PATH
  ? path.isAbsolute(process.env.UPLOAD_PATH)
    ? process.env.UPLOAD_PATH
    : path.resolve(process.cwd(), process.env.UPLOAD_PATH)
  : path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadRoot));

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Test DB
app.get('/test-db', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ message: 'Kết nối SQL Server thành công!', status: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Kết nối SQL Server thất bại', error: error.message });
  }
});

// Routes
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

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Đường dẫn không tồn tại' });
});

// Start
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