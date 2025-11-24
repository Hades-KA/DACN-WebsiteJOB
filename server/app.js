// server/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit'); // (chưa dùng nhưng để sẵn)
const path = require('path');
const fs = require('fs');
const http = require('http'); 
require('dotenv').config();
const { sequelize, initDatabase } = require('./src/config/database');
const { initSocket } = require('./src/realtime/socket'); 

const app = express();
const server = http.createServer(app); // ⬅️ dùng server HTTP cho socket
const PORT = process.env.PORT || 5001;

/* ============ Security (helmet + CORS) ============ */
// Cho phép nhúng tài nguyên cross-origin (ảnh /uploads),
// tắt COEP để không chặn nhúng khi không cần.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

const defaultClientUrls = 'http://localhost:5175,http://127.0.0.1:5175';
const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  defaultClientUrls
)
  .split(',')
  .map((o) => o.trim())
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
// ĐÃ SỬA: Thêm strict: false để cho phép null/primitive values
app.use(express.json({ limit: '10mb', strict: false }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined'));

/* ============ Upload path ============ */
const uploadRoot = process.env.UPLOAD_PATH
  ? path.isAbsolute(process.env.UPLOAD_PATH)
    ? process.env.UPLOAD_PATH
    : path.resolve(process.cwd(), process.env.UPLOAD_PATH)
  : path.resolve(process.cwd(), 'uploads');

/* ============ Serve static uploads (ĐẶT TRƯỚC TẤT CẢ ROUTES) ============ */
app.use(
  '/uploads',
  (req, res, next) => {
    console.log('📁 [UPLOADS] Request:', req.method, req.url);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Cho phép FE dev truy cập ảnh; production có thể giới hạn theo allowedOrigins[0]
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.length) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    next();
  },
  express.static(uploadRoot)
);

/* ============ Debug uploads ============ */
app.get('/__debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadRoot);
    res.json({
      uploadRoot,
      exists: fs.existsSync(uploadRoot),
      files,
      count: files.length,
      message: 'Debug: danh sách file trong thư mục uploads',
    });
  } catch (err) {
    res.status(500).json({
      uploadRoot,
      exists: false,
      error: err.message,
    });
  }
});

/* ============ Health & DB test ============ */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uploadRoot,
  });
});

app.get('/test-db', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ message: 'Kết nối SQL Server thành công!', status: 'OK' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Kết nối SQL Server thất bại', error: error.message });
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
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/saved-jobs', require('./src/routes/savedJobRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/chat', require('./src/routes/chatRoutes')); // ⬅️ route chat mới

/* ============ Error handler ============ */
app.use((err, _req, res, _next) => {
  console.error(' [ERROR]', err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

/* ============ 404 handler (ĐẶT CUỐI CÙNG) ============ */
app.use('*', (req, res) => {
  console.log('⚠️  [404] Route không tồn tại:', req.method, req.originalUrl);
  res.status(404).json({ message: 'Đường dẫn không tồn tại' });
});

/* ============ Start ============ */
const startServer = async () => {
  try {
    await initDatabase();

    // Khởi tạo Socket.IO
    const io = initSocket(server, allowedOrigins);
    app.set('io', io);

    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
      console.log(`📊 Kiểm tra sức khỏe: http://localhost:${PORT}/health`);
      console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Uploads served at /uploads from: ${uploadRoot}`);
      console.log(`🔍 Debug uploads: http://localhost:${PORT}/__debug/uploads`);
      console.log(`📈 Analytics API: http://localhost:${PORT}/api/analytics/*`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/chat/*`);
    });
  } catch (error) {
    console.error('❌ Server không khởi động được:', error);
  }
};
startServer();

module.exports = app;