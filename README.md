# Job Hire Platform - Hệ thống tuyển dụng 

Hệ thống web tuyển dụng tích hợp AI/ML để phân tích CV và dự đoán hiệu quả ứng viên

## 🚀 Tính năng chính

### Frontend (React + Vite)
- **Trang chủ**: Tìm kiếm việc làm với bộ lọc 
- **Đăng nhập/Đăng ký**: Hỗ trợ ứng viên và nhà tuyển dụng
- **Đăng tin tuyển dụng**: Tạo tin tuyển dụng chi tiết
- **Danh sách CV**: Quản lý và phân tích CV với AI
- **Dashboard**: Thống kê và báo cáo chi tiết
- **Upload CV**: Tải lên và phân tích CV tự động

### Backend (Node.js + Express)
- **API RESTful**: Đầy đủ endpoints cho tất cả chức năng
- **Xác thực JWT**: Bảo mật cao với token
- **Kết nối SQL Server**: Quản lý dữ liệu với Sequelize ORM
- **Tích hợp AI/ML**: Phân tích CV và dự đoán hiệu quả
- **Upload file**: Hỗ trợ PDF, Word, TXT
- **Rate limiting**: Bảo vệ API khỏi spam

### AI/ML Integration
- **Phân tích CV**: Đánh giá kỹ năng, kinh nghiệm, điểm mạnh/yếu
- **Dự đoán hiệu quả**: Dự đoán khả năng thành công của ứng viên
- **Gợi ý việc làm**: AI đề xuất việc làm phù hợp
- **Gợi ý ứng viên**: AI đề xuất ứng viên phù hợp cho công việc
- **Phân tích độ phù hợp**: So sánh CV với yêu cầu công việc

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool nhanh
- **React Router** - Điều hướng
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Sequelize** - ORM
- **SQL Server** - Database
- **JWT** - Authentication
- **Multer** - File upload
- **Bcryptjs** - Password hashing
- **Express Validator** - Validation

### AI/ML
- **Python API** - AI/ML service (từ đồ án cơ sở)
- **NLP** - Xử lý ngôn ngữ tự nhiên
- **Machine Learning** - Dự đoán và phân tích
- **Big Data** - Xử lý dữ liệu lớn

## 📦 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- SQL Server 2019+
- Python 3.8+ (cho AI service)

### 1. Clone repository
```bash
git clone <repository-url>
cd job-hire-platform
```

### 2. Cài đặt Frontend
```bash
cd client
npm install
npm run dev
```

### 3. Cài đặt Backend
```bash
cd server
npm install
```

### 4. Cấu hình Database
1. Tạo database `HeThongTuyenDungDB` trong SQL Server
2. Sao chép file `.env.example` thành `.env`
3. Cập nhật thông tin database trong `.env`:

```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=HeThongTuyenDungDB
DB_USER=sa
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key
```

### 5. Chạy Backend
```bash
cd server
npm run dev
```

### 6. Cấu hình AI Service
1. Đảm bảo AI service từ đồ án cơ sở đang chạy
2. Cập nhật `AI_API_URL` trong `.env`:
```env
AI_API_URL=http://localhost:8000/api
AI_API_KEY=your_ai_api_key
```

## 🗂️ Cấu trúc dự án

```
job-hire-platform/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Backend Node.js
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Lấy thông tin user
- `PUT /api/auth/profile` - Cập nhật profile

### Jobs
- `GET /api/jobs` - Lấy danh sách việc làm
- `GET /api/jobs/:id` - Lấy chi tiết việc làm
- `POST /api/jobs` - Tạo việc làm mới
- `PUT /api/jobs/:id` - Cập nhật việc làm
- `DELETE /api/jobs/:id` - Xóa việc làm
- `GET /api/jobs/search` - Tìm kiếm việc làm

### CVs
- `GET /api/cvs` - Lấy danh sách CV
- `GET /api/cvs/:id` - Lấy chi tiết CV
- `POST /api/cvs/upload` - Upload CV
- `PUT /api/cvs/:id` - Cập nhật CV
- `DELETE /api/cvs/:id` - Xóa CV
- `GET /api/cvs/search` - Tìm kiếm CV

### AI/ML
- `POST /api/ai/analyze-cv/:cvId` - Phân tích CV
- `POST /api/ai/predict-performance` - Dự đoán hiệu quả
- `GET /api/ai/job-recommendations/:candidateId` - Gợi ý việc làm
- `GET /api/ai/candidate-recommendations/:jobId` - Gợi ý ứng viên
- `POST /api/ai/analyze-job-match` - Phân tích độ phù hợp

### Dashboard
- `GET /api/dashboard` - Dữ liệu dashboard
- `GET /api/dashboard/stats` - Thống kê

## 🎯 Luồng hoạt động

### 1. Ứng viên
1. Đăng ký tài khoản
2. Upload CV
3. AI phân tích CV tự động
4. Tìm kiếm việc làm phù hợp
5. Ứng tuyển việc làm
6. Theo dõi trạng thái ứng tuyển

### 2. Nhà tuyển dụng
1. Đăng ký tài khoản
2. Đăng tin tuyển dụng
3. Xem danh sách CV ứng viên
4. AI phân tích và đánh giá ứng viên
5. Lọc và sắp xếp ứng viên
6. Liên hệ ứng viên phù hợp

### 3. AI/ML Processing
1. Nhận CV từ ứng viên
2. Trích xuất thông tin (NLP)
3. Phân tích kỹ năng và kinh nghiệm
4. Đánh giá điểm mạnh/yếu
5. Dự đoán hiệu quả công việc
6. Gợi ý việc làm phù hợp

## 🔒 Bảo mật

- **JWT Authentication**: Xác thực an toàn
- **Password Hashing**: Mã hóa mật khẩu với bcrypt
- **Rate Limiting**: Giới hạn request
- **Input Validation**: Kiểm tra dữ liệu đầu vào
- **CORS**: Cấu hình cross-origin
- **Helmet**: Bảo mật HTTP headers

## 📊 Database Schema

### Users
- id, name, email, password, phone, userType, company, avatar, isActive, isVerified

### Jobs
- id, title, company, location, salary, type, experience, description, requirements, benefits, category, skills, deadline, isActive, isFeatured, applicationsCount, viewsCount, employerId

### CVs
- id, candidateName, email, phone, position, experience, location, skills, education, workExperience, projects, languages, certifications, fileName, filePath, fileSize, fileType, aiScore, aiAnalysis, isAnalyzed, isActive, candidateId

### Applications
- id, status, coverLetter, expectedSalary, availableFrom, notes, aiMatchScore, aiAnalysis, isAnalyzed, jobId, candidateId, cvId

## 🚀 Triển khai

### Development
```bash
# Frontend
cd client && npm run dev

# Backend
cd server && npm run dev
```

### Production
```bash
# Build frontend
cd client && npm run build

# Start backend
cd server && npm start
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

- Email: contact@jobhire.com
- Phone: +84 123 456 789
- Website: https://jobhire.com

## 🙏 Acknowledgments

- React team cho framework tuyệt vời
- Node.js community cho ecosystem phong phú
- AI/ML từ đồ án cơ sở
- Tất cả contributors và supporters
