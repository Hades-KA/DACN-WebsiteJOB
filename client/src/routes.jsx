// client/src/routes.jsx
// Cấu hình route chính cho ứng dụng JobHire

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ===== Trang Public =====
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';

// Trang Auth mới
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// Trang Ngành nghề/Địa điểm (list)
import Jobs from './pages/Jobs';

// ===== Ứng viên (Candidate) =====
import ProfileLayout from './pages/profile/ProfileLayout';
import ProfileOverview from './pages/profile/Overview';
import MyProfile from './pages/profile/MyProfile';
import MyApplications from './pages/MyApplications';
import SavedJobs from './pages/SavedJobs';
import Notifications from './pages/profile/Notifications';
import AccountSettings from './pages/profile/AccountSettings';

// ===== Nhà tuyển dụng (Employer) =====
import EmployerLayout from './components/employer/EmployerLayout';
import EmployerDashboard from './pages/employer/Dashboard';
import MyJobs from './pages/employer/MyJobs';
import Applicants from './pages/employer/Applicants';
import JobPost from './pages/JobPost';
import CompanyProfile from './pages/employer/CompanyProfile';
import EmployerCVs from './pages/employer/CVManagement';
import EmployerCandidates from './pages/employer/Candidates';
import EmployerReports from './pages/employer/Reports'; 

// ===== Quản trị viên (Admin) =====
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminJobs from './pages/admin/Jobs';
import AdminUsers from './pages/admin/Users';
import AdminApplications from './pages/admin/Applications';
import CompanyDetail from './pages/admin/CompanyDetail';
import AdminJobDetail from './pages/admin/JobDetail'; // ✅ THÊM IMPORT NÀY

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
  if (token && userType === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Home />;
}

// ===== Shell =====
function Shell() {
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isEmployerRoute = location.pathname.startsWith('/employer');
  const isAuthPage =
    location.pathname.startsWith('/login') || 
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/verify-email');

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
          
          {/* Auth routes mới */}
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

          {/* ===== Candidate ===== */}
          <Route
            path="/profile"
            element={<ProtectedRoute><ProfileLayout /></ProtectedRoute>}
          >
            <Route index element={<ProfileOverview />} />
            <Route path="myprofile" element={<MyProfile />} />
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
            <Route path="notifications" element={<Notifications />} />
            <Route path="account" element={<AccountSettings />} />
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
            <Route path="reports" element={<EmployerReports />} />
          </Route>

          {/* ===== Admin ===== */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="companies/:id" element={<CompanyDetail />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="jobs/:id" element={<AdminJobDetail />} /> {/* ✅ THÊM DÒNG NÀY */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="applications" element={<AdminApplications />} />
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