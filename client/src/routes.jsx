// client/src/routes.jsx
// Cấu hình route chính cho ứng dụng JobHire

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ===== Trang Public =====
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';

// ===== Ứng viên (Candidate) =====
import ProfileLayout from './pages/profile/ProfileLayout';
import ProfileOverview from './pages/profile/Overview';
import ProfilePersonal from './pages/profile/Personal';
import MyApplications from './pages/MyApplications';
import SavedJobs from './pages/SavedJobs';

// ===== Nhà tuyển dụng (Employer) =====
import EmployerLayout from './components/employer/EmployerLayout';
import EmployerDashboard from './pages/employer/Dashboard';
import MyJobs from './pages/employer/MyJobs';
import Applicants from './pages/employer/Applicants';
import JobPost from './pages/JobPost';
import CompanyProfile from './pages/employer/CompanyProfile'; 

// ===== Quản trị viên (Admin) =====
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminJobs from './pages/admin/Jobs';
import AdminUsers from './pages/admin/Users';
import AdminHome from './pages/admin/AdminHome';

// ===== Thành phần chung =====
import Header from './components/Header';
import Footer from './components/Footer';

// ===== Route bảo vệ (có kiểm tra đăng nhập & role) =====
const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (roles && roles.length) {
    const userRaw = localStorage.getItem('user');
    const user = userRaw && userRaw !== 'undefined' && userRaw !== 'null' ? JSON.parse(userRaw) : null;
    const userType = user?.userType;

    // nếu không đúng quyền thì quay về trang chủ
    if (!userType || (!roles.includes(userType) && userType !== 'admin')) {
      return <Navigate to="/" replace />;
    }
  }
  return children;
};

// ===== Route công khai (ẩn login/register khi đã đăng nhập) =====
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return children;
  return <Navigate to="/" replace />;
};

// ===== Trang trung gian tự điều hướng theo loại tài khoản =====
function Landing() {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  let userType = null;
  try { userType = raw ? JSON.parse(raw).userType : null; } catch {}

  if (token && userType === 'employer') return <Navigate to="/employer/dashboard" replace />;
  if (token && userType === 'admin') return <Navigate to="/admin" replace />;
  return <Home />;
}

// ===== Shell bao khung toàn app =====
function Shell() {
  const location = useLocation();

  // ẩn Header/Footer cho admin, employer, login/register
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isEmployerRoute = location.pathname.startsWith('/employer');
  const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/register');
  const hideHeaderFooter = isAuthPage || isAdminRoute || isEmployerRoute;

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeaderFooter && <Header />}
      <main className={`flex-1 ${!hideHeaderFooter ? 'pt-16' : ''}`}>
        <Routes>
          {/* ===== Public ===== */}
          <Route path="/" element={<Landing />} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* ===== Candidate ===== */}
          <Route path="/profile" element={<ProtectedRoute><ProfileLayout /></ProtectedRoute>}>
            <Route index element={<ProfileOverview />} />
            <Route path="personal" element={<ProfilePersonal />} />
          </Route>
          <Route path="/my-applications" element={<ProtectedRoute roles={['candidate']}><MyApplications /></ProtectedRoute>} />
          <Route path="/saved-jobs" element={<ProtectedRoute roles={['candidate']}><SavedJobs /></ProtectedRoute>} />

          {/* ===== Employer ===== */}
          <Route path="/employer" element={<ProtectedRoute roles={['employer']}><EmployerLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployerDashboard />} />
            <Route path="jobs" element={<MyJobs />} />
            <Route path="jobs/new" element={<JobPost />} />
            <Route path="jobs/:jobId/applicants" element={<Applicants />} />
            <Route path="company" element={<CompanyProfile />} /> // ✅ Dùng trang thật thay vì placeholder
            <Route path="recruitment" element={<div className="p-4">Tuyển dụng (đang phát triển)</div>} />
            <Route path="cvs" element={<div className="p-4">Quản lý CV (đang phát triển)</div>} />
            <Route path="candidates" element={<div className="p-4">Quản lý ứng viên (đang phát triển)</div>} />
            <Route path="reports" element={<div className="p-4">Báo cáo & Thống kê (đang phát triển)</div>} />
          </Route>

          {/* ===== Admin ===== */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminHome />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* ===== 404 fallback ===== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

// ===== App gốc =====
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Shell />} />
      </Routes>
    </Router>
  );
}
