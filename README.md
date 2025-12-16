# Job Hire Platform – Hệ thống tuyển dụng tích hợp AI

Hệ thống web hỗ trợ tuyển dụng ngành CNTT, gồm 3 vai trò **Ứng viên – Nhà tuyển dụng – Admin**, tích hợp AI để:

- Phân tích CV và so khớp với JD.
- Gợi ý việc làm cho ứng viên.
- Gợi ý, chấm điểm ứng viên cho nhà tuyển dụng.

README này được viết để **giảng viên có thể cài đặt và chạy Demo trên một máy duy nhất** theo từng bước cụ thể.

---

## 1. Môi trường & công nghệ

- **Hệ điều hành khuyến nghị**: Windows 10/11 64‑bit.
- **Node.js**: ≥ 18.x (khuyến nghị bản LTS mới nhất).
- **npm**: đi kèm Node.js.
- **SQL Server**: 2019 trở lên (Developer/Express đều được).
- **SQL Server Management Studio (SSMS)**: để restore / chạy script SQL.
- **Python**: ≥ 3.8 (để chạy AI service từ đồ án cơ sở).
- Trình duyệt: Chrome / Edge mới nhất.

**Backend**: Node.js, Express, Sequelize, SQL Server, JWT, Multer, Bcrypt, Express‑Validator…  
**Frontend**: React + Vite, React Router, Tailwind CSS, Axios…  
**AI service**: Flask/Python, sử dụng các mô‑đun NLP/ML từ đồ án cơ sở.

---

## 2. Chuẩn bị Database (bắt buộc trước khi chạy Backend)

1. Mở **SQL Server Management Studio** và kết nối tới SQL Server local.
2. Tạo mới một database trống, ví dụ: `HeThongTuyenDungDB`.
3. Mở file script:
   - `HeThongTuyenDung1.sql` (trong thư mục gốc project).
4. Chọn database vừa tạo và **Execute** toàn bộ script để tạo bảng, khoá ngoại, trigger…
5. Kiểm tra lại trong `HeThongTuyenDungDB` đã có đầy đủ các bảng: `users`, `jobs`, `cvs`, `applications`, `scores`, `saved_jobs`, `notifications`, `conversations`, `messages`, v.v.

> Lưu ý: Nếu đã có database cũ trùng tên, nên **drop** hoặc đổi tên trước khi chạy script để tránh lỗi.

---

## 3. Cấu hình Backend (server)

1. Mở **Terminal / PowerShell** tại thư mục gốc project:

   ```bash
   cd server
   npm install
   ```

2. Tạo file môi trường `.env` từ mẫu:

   ```bash
   copy .env.example .env   # Trên PowerShell
   ```

3. Mở file `server/.env` và chỉnh các biến quan trọng (ví dụ cấu hình SQL Server local):

   ```env
# Kết nối SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_NAME=HeThongTuyenDungDB
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_DIALECT=mssql

# JWT dùng cho đăng nhập
JWT_SECRET=change_this_to_a_random_secret

# Địa chỉ AI service (Flask)
AI_BASE_URL=http://localhost:8001/v1
AI_API_KEY=dev-key

# Cổng Backend
PORT=5001
   ```

4. Chạy Backend (giữ terminal này luôn mở trong khi Demo):

   ```bash
   npm run dev
   ```

   - API sẽ chạy tại: `http://localhost:5001/api` (hoặc cổng bạn cấu hình trong biến PORT).
   - Nếu log báo **kết nối DB lỗi**, kiểm tra lại thông tin `DB_*` và chắc chắn SQL Server đang chạy.

---

## 4. Cấu hình & chạy AI Service (Python)

> Phần này dùng lại mã nguồn AI từ đồ án cơ sở. Nếu chỉ Demo chức năng cơ bản (không cần chấm điểm realtime) có thể bỏ qua, nhưng để các màn hình AI (gợi ý, scoring, báo cáo) hoạt động đầy đủ thì nên bật.

1. Mở một thư mục chứa project AI (ví dụ `ai-service/`).
2. Tạo môi trường ảo Python (khuyến nghị):

   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Chạy Flask/UVicorn (tùy theo project AI của bạn), ví dụ:

   ```bash
   python main.py
   ```

4. Đảm bảo AI service chạy OK, ví dụ truy cập:  
   `http://localhost:8001/health` (nếu có endpoint health)  
   hoặc các endpoint dưới prefix `/v1` như `/v1/score-match`.  
   (địa chỉ này phải trùng với `AI_BASE_URL` trong `server/.env`, mặc định `http://localhost:8001/v1`).

---

## 5. Cấu hình & chạy Frontend (client)

1. Mở **Terminal mới** tại thư mục gốc project rồi chạy:

   ```bash
   cd client
   npm install
   ```

2. Chạy Vite dev server:

   ```bash
   npm run dev
   ```

3. Truy cập trên trình duyệt:  
   `http://localhost:5175` (hoặc đúng cổng do Vite hiển thị).

4. Frontend gọi Backend thông qua biến môi trường `VITE_API_URL`.
   - Tạo file `.env.local` trong thư mục `client` với nội dung:

     ```env
     VITE_API_URL=http://localhost:5001/api
     ```

   - Nếu PORT của backend thay đổi, chỉ cần sửa lại giá trị `VITE_API_URL` cho phù hợp.
---

## 6. Tài khoản demo gợi ý (có thể chỉnh lại cho phù hợp)

Tùy dữ liệu nhóm đã seed vào DB. Gợi ý một số tài khoản mẫu (nếu đã tạo trước):

- **Admin**:  
  - Email: `admin@example.com`  
  - Mật khẩu: `123456`  
  - Đăng nhập → truy cập `/admin`.

- **Nhà tuyển dụng**:  
  - Email: `employer@example.com`  
  - Mật khẩu: `123456`  
  - Đăng nhập → xem Dashboard, đăng tin, xem Applicants, Reports.

- **Ứng viên**:  
  - Email: `candidate@example.com`  
  - Mật khẩu: `123456`  
  - Đăng nhập → cập nhật hồ sơ, bật AI gợi ý việc làm, apply job.

> Nếu giảng viên dùng DB mới hoàn toàn, nên tạo sẵn vài tài khoản trong bảng `users` hoặc thông qua màn hình đăng ký rồi cập nhật `userType` cho đúng (candidate/employer/admin).

---

## 7. Các bước Demo gợi ý

1. Đăng nhập bằng tài khoản **ứng viên** → vào trang **Việc làm** → bật chế độ **AI gợi ý** để xem danh sách job kèm % phù hợp.
2. Ứng viên chọn 1 job → **Apply**. Backend sẽ tạo `applications` và enqueue chấm điểm AI.
3. Đăng nhập bằng **nhà tuyển dụng** → mở **Applicants** của job đó:  
   - Xem 3 tab: *AI gợi ý (>=70%)*, *Phù hợp (>=50%)*, *Không phù hợp (<50%)*.  
   - Thấy điểm AI và kỹ năng phù hợp/thiếu.
4. Mở trang **Reports/Báo cáo** để xem phân bố điểm AI, phễu tuyển dụng, top kỹ năng match/thiếu, top job hiệu suất.

---

## 8. Lỗi thường gặp & cách xử lý nhanh

- **Backend không kết nối được DB**:
  - Kiểm tra SQL Server đã chạy.  
  - Mở `server/.env` xem `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT=mssql` đã đúng chưa.

- **Frontend không gọi được API (CORS / Network Error)**:
  - Kiểm tra backend có chạy ở `http://localhost:5001`.  
  - Nếu backend dùng cổng khác, sửa biến `VITE_API_URL` trong file `.env.local` của thư mục `client` cho trùng với URL backend (ví dụ: `VITE_API_URL=http://localhost:5001/api`).

- **AI features không hoạt động (không có điểm AI/gợi ý)**:
  - Kiểm tra AI service Python có chạy và `AI_BASE_URL` trong `server/.env` đúng (`http://localhost:8001/v1`).  
  - Xem log của backend (terminal server) để biết lỗi cụ thể.

- **Cổng bị chiếm (EADDRINUSE)**:
  - Đổi PORT trong `.env` hoặc tắt ứng dụng khác đang dùng cùng cổng.

---

## 9. Cấu trúc thư mục (tóm tắt)

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
│   │   ├── config/        # Cấu hình DB & Sequelize
│   │   ├── controllers/   # Xử lý nghiệp vụ cho từng module
│   │   ├── middleware/    # Middleware (auth, upload,...)
│   │   ├── models/        # Sequelize models mapping SQL Server
│   │   ├── routes/        # Khai báo API endpoints
│   │   ├── services/      # Business logic + gọi AI service
│   │   └── utils/         # Helper (mailer, email template,...)
│   └── package.json
└── README.md
```
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

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- React 
- Node.js 
- AI/ML từ đồ án cơ sở

