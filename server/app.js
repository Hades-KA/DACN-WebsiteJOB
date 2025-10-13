const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { sequelize, initDatabase } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 5001; // Cổng chạy server, khớp với .env

// Cấu hình bảo mật
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5175')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') { // Trong môi trường dev, cho phép tất cả
      return callback(null, true);
    }
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Không được phép bởi CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Middleware xử lý body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware nén dữ liệu
app.use(compression());

// Middleware ghi log
app.use(morgan('combined'));

// Endpoint kiểm tra sức khỏe
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint kiểm tra kết nối database
app.get('/test-db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ message: 'Kết nối SQL Server thành công!', status: 'OK' });
  } catch (error) {
    res.status(500).json({ message: 'Kết nối SQL Server thất bại', error: error.message });
  }
});

// Routes API
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

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Xử lý 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Đường dẫn không tồn tại'
  });
});

// Khởi động server
const startServer = async () => {
  try {
    await initDatabase(); // Khởi tạo và đồng bộ database
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
      console.log(`📊 Kiểm tra sức khỏe: http://localhost:${PORT}/health`);
      console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Server không khởi động được:', error);
  }
};

startServer();

module.exports = app;
