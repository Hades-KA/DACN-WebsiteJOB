import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import CVList from './pages/CVList';
import SavedJobs from './pages/SavedJobs';
import MyApplications from './pages/MyApplications';
import JobPost from './pages/JobPost';
import Dashboard from './pages/Dashboard';
import AdminHome from './pages/admin/AdminHome';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminJobs from './pages/admin/Jobs';
import AdminUsers from './pages/admin/Users';
import Header from './components/Header';
import Footer from './components/Footer';

// Protected Route Component with role-based access
const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  if (roles && roles.length) {
    const userRaw = localStorage.getItem('user');
    const user = userRaw && userRaw !== 'undefined' && userRaw !== 'null' ? JSON.parse(userRaw) : null;
    const userType = user?.userType;
    if (!userType || !roles.includes(userType)) {
      return <Navigate to="/" />;
    }
  }
  return children;
};

// Public Route Component (redirect if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return children;
  
  // Simple redirect for now
  return <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route path="/job/:id" element={<JobDetail />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminHome />} />
            </Route>
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute roles={["employer"]}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cv-list" 
              element={
                <ProtectedRoute roles={["candidate","admin"]}>
                  <CVList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/saved-jobs" 
              element={
                <ProtectedRoute roles={["candidate","admin"]}>
                  <SavedJobs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/post-job" 
              element={
                <ProtectedRoute roles={["employer","admin"]}>
                  <JobPost />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-applications" 
              element={
                <ProtectedRoute roles={["candidate","admin"]}>
                  <MyApplications />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default AppRoutes;