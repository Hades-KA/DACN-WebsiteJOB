// client/src/routes.jsx
// Cấu hình route chính cho ứng dụng JobHire

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ===== Trang Public =====
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';

// Trang Ngành nghề/Địa điểm (list)
import Jobs from './pages/Jobs';

// ===== Ứng viên (Candidate) =====
import ProfileLayout from './pages/profile/ProfileLayout';
import ProfileOverview from './pages/profile/Overview';
import MyProfile from './pages/profile/MyProfile'; // NEW: Trang “Hồ Sơ Của Tôi”
import MyApplications from './pages/MyApplications';
import SavedJobs from './pages/SavedJobs';

// ===== Nhà tuyển dụng (Employer) =====
import EmployerLayout from './components/employer/EmployerLayout';
import EmployerDashboard from './pages/employer/Dashboard';
import MyJobs from './pages/employer/MyJobs';
import Applicants from './pages/employer/Applicants';
import JobPost from './pages/JobPost';
import CompanyProfile from './pages/employer/CompanyProfile';
import EmployerCVs from './pages/employer/CVManagement';
import EmployerCandidates from './pages/employer/Candidates';

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

// ===== Route bảo vệ =====
const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  let userType;
  try {
    const raw = localStorage.getItem('user');
    userType = raw ? JSON.parse(raw)?.userType : undefined;
  } catch {
    userType = undefined;
  }

  if (roles && roles.length) {
    if (!userType || (!roles.includes(userType) && userType !== 'admin')) {
      return <Navigate to="/" replace />;
    }
  }
  return children;
};

// ===== Route công khai =====
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return children;
  return <Navigate to="/" replace />;
};

// ===== Landing =====
function Landing() {
  const token = localStorage.getItem('token');
  let userType = null;
  try {
    const raw = localStorage.getItem('user');
    userType = raw ? JSON.parse(raw).userType : null;
  } catch {}

  if (token && userType === 'employer') return <Navigate to="/employer/dashboard" replace />;
  if (token && userType === 'admin') return <Navigate to="/admin" replace />;
  return <Home />;
}

// ===== Shell =====
function Shell() {
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isEmployerRoute = location.pathname.startsWith('/employer');
  const isAuthPage =
    location.pathname.startsWith('/login') || location.pathname.startsWith('/register');

  const hideHeaderFooter = isAuthPage || isAdminRoute || isEmployerRoute;

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeaderFooter && <Header />}

      <main className="flex-1">
        <Routes>

          {/* ===== Public ===== */}
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/job/:id" element={<JobDetail />} />

          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* ===== Candidate ===== */}
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfileLayout /></ProtectedRoute>}
          >
            <Route index element={<ProfileOverview />} />

            {/* Hồ sơ của tôi */}
            <Route path="myprofile" element={<MyProfile />} />

            {/* Không còn Personal nữa */}

            <Route
              path="my-applications"
              element={
                <ProtectedRoute roles={['candidate']}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="saved-jobs"
              element={
                <ProtectedRoute roles={['candidate']}>
                  <SavedJobs />
                </ProtectedRoute>
              }
            />

            <Route path="notifications" element={<div className="p-4">Thông báo việc làm (đang phát triển)</div>} />
            <Route path="account" element={<div className="p-4">Cài đặt tài khoản (đang phát triển)</div>} />
          </Route>

          <Route
            path="/my-applications"
            element={<ProtectedRoute roles={['candidate']}><MyApplications /></ProtectedRoute>}
          />
          <Route
            path="/saved-jobs"
            element={<ProtectedRoute roles={['candidate']}><SavedJobs /></ProtectedRoute>}
          />

          {/* ===== Employer ===== */}
          <Route
            path="/employer"
            element={<ProtectedRoute roles={['employer']}><EmployerLayout /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployerDashboard />} />
            <Route path="jobs" element={<MyJobs />} />
            <Route path="jobs/new" element={<JobPost />} />
            <Route path="jobs/:jobId/applicants" element={<Applicants />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="recruitment" element={<div className="p-4">Tuyển dụng (đang phát triển)</div>} />
            <Route path="cvs" element={<EmployerCVs />} />
            <Route path="candidates" element={<EmployerCandidates />} />
            <Route path="reports" element={<div className="p-4">Báo cáo & Thống kê (đang phát triển)</div>} />
          </Route>

          {/* ===== Admin ===== */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminHome />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* ===== 404 ===== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

// ===== App root =====
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Shell />} />
      </Routes>
    </Router>
  );
}
