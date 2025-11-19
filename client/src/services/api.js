// client/src/services/api.js
import axios from 'axios';

// Base URL: tự tránh lặp /api/api
const rawBase = import.meta?.env?.VITE_API_URL || 'http://localhost:5001';
const trimmed = String(rawBase).replace(/\/$/, '');
const apiBase = /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;

const api = axios.create({
  baseURL: apiBase,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // bật nếu backend dùng cookie thay vì Bearer
});

const getToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('access_token') ||
  localStorage.getItem('accessToken') ||
  null;

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const silent =
      error?.config?.headers?.['x-silent-error'] === '1' ||
      error?.config?.headers?.['X-Silent-Error'] === '1' ||
      error?.config?.silent === true;

    if (!silent) {
      console.error('API Error:', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status,
        data: error.response?.data,
        msg: error.message,
      });
    }

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Chuẩn hóa ID khi ghép vào URL
const normId = (v) => encodeURIComponent(String(v ?? '').trim());

// ========== Auth ==========
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// ========== Jobs ==========
export const jobService = {
  getAllJobs: (params = {}) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${normId(id)}`),
  createJob: (jobData) => api.post('/jobs', jobData),
  updateJob: (id, jobData) => api.put(`/jobs/${normId(id)}`, jobData),
  deleteJob: (id) => api.delete(`/jobs/${normId(id)}`),
  searchJobs: (searchParams) => api.get('/jobs/search', { params: searchParams }),
  getJobsByCompany: (companyId) => api.get(`/jobs/company/${normId(companyId)}`),
  applyJob: (jobId, applicationData) => api.post(`/jobs/${normId(jobId)}/apply`, applicationData),

  // ĐÚNG với backend (jobRoutes)
  getJobApplications: (jobId) => api.get(`/jobs/${normId(jobId)}/applications`),

  updateJobStatus: (id, payload) => api.patch(`/jobs/${normId(id)}/status`, payload),
  
  // THÊM MỚI: Rescore tất cả ứng viên của job
  rescoreJobApplications: (jobId, body = {}) => api.post(`/jobs/${normId(jobId)}/rescore-applications`, body),
};

// ========== CV ==========
export const cvService = {
  getAllCVs: (params = {}) => api.get('/cvs', { params }),
  getCVById: (id) => api.get(`/cvs/${normId(id)}`),
  uploadCV: (formData) =>
    api.post('/cvs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCV: (id, cvData) => api.put(`/cvs/${normId(id)}`, cvData),
  deleteCV: (id) => api.delete(`/cvs/${normId(id)}`),
  searchCVs: (searchParams) => api.get('/cvs/search', { params: searchParams }),
  downloadCV: (id) => api.get(`/cvs/${normId(id)}/download`, { responseType: 'blob' }),
  analyzeCV: (id) => api.post(`/cvs/${normId(id)}/analyze`),
  getCVAnalysis: (id) => api.get(`/cvs/${normId(id)}/analysis`),
};

// ========== Users ==========
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData, config = {}) => api.patch('/users/profile', userData, config),
  changePassword: (passwordData) => api.put('/users/password', passwordData),
  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUsers: (params = {}) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${normId(id)}`),
  updateUser: (id, userData) => api.put(`/users/${normId(id)}`, userData),
  deleteUser: (id) => api.delete(`/users/${normId(id)}`),
};

// ========== Dashboard ==========
export const dashboardService = {
  getDashboardData: () => api.get('/dashboard'),
  getStats: () => api.get('/dashboard/stats'),
  getRecentJobs: () => api.get('/dashboard/recent-jobs'),
  getTopCandidates: () => api.get('/dashboard/top-candidates'),
  getAIInsights: () => api.get('/dashboard/ai-insights'),
  getAnalytics: (period = '30d') => api.get(`/dashboard/analytics?period=${period}`),
};

// ========== AI ==========
export const aiService = {
  analyzeCV: (cvId) => api.post(`/ai/analyze-cv/${normId(cvId)}`),
  predictPerformance: (candidateId, jobId) => api.post('/ai/predict-performance', { candidateId, jobId }),
  getJobRecommendations: (candidateId) => api.get(`/ai/job-recommendations/${normId(candidateId)}`),
  getCandidateRecommendations: (jobId) => api.get(`/ai/candidate-recommendations/${normId(jobId)}`),
  analyzeJobMatch: (cvId, jobId) => api.post('/ai/analyze-job-match', { cvId, jobId }),
  getSkillGaps: (candidateId, jobId) => api.get(`/ai/skill-gaps/${normId(candidateId)}/${normId(jobId)}`),
  generateJobDescription: (jobData) => api.post('/ai/generate-job-description', jobData),
  optimizeJobPosting: (jobId) => api.post(`/ai/optimize-job-posting/${normId(jobId)}`),
};

// ========== Companies ==========
export const companyService = {
  getCompanies: (params = {}) => api.get('/companies', { params }),
  getCompanyById: (id) => api.get(`/companies/${normId(id)}`),
  createCompany: (companyData) => api.post('/companies', companyData),
  updateCompany: (id, companyData) => api.put(`/companies/${normId(id)}`, companyData),
  deleteCompany: (id) => api.delete(`/companies/${normId(id)}`),
  getCompanyJobs: (id, params = {}) => api.get(`/companies/${normId(id)}/jobs`, { params }),
  getCompanyStats: (id) => api.get(`/companies/${normId(id)}/stats`),
  uploadLogo: (id, file) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post(`/companies/${normId(id)}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ========== Applications ==========
export const applicationService = {
  getApplications: (params = {}) => api.get('/applications', { params }),
  getApplicationById: (id) => api.get(`/applications/${normId(id)}`),
  createApplication: (applicationData) => api.post('/applications', applicationData),
  updateApplication: (id, applicationData) => api.put(`/applications/${normId(id)}`, applicationData),
  deleteApplication: (id) => api.delete(`/applications/${normId(id)}`),

  // Tùy backend của bạn là PUT hay PATCH. Nếu backend là PATCH, đổi thành api.patch.
  updateApplicationStatus: (id, status) => api.put(`/applications/${normId(id)}/status`, { status }),

  // ĐIỀU CHỈNH QUAN TRỌNG: khớp backend /jobs/:id/applications
  getApplicationsByJob: (jobId) => api.get(`/jobs/${normId(jobId)}/applications`),

  getApplicationsByCandidate: (candidateId) => api.get(`/applications/candidate/${normId(candidateId)}`),
  getMyApplications: (params = {}) => api.get('/applications/candidate/me', { params }),
};

// ========== Notifications ==========
export const notificationService = {
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${normId(id)}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${normId(id)}`),
  createNotification: (notificationData) => api.post('/notifications', notificationData),
};

// ========== Files ==========
export const fileService = {
  uploadFile: (formData) => api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadFile: (id) => api.get(`/files/${normId(id)}/download`, { responseType: 'blob' }),
  deleteFile: (id) => api.delete(`/files/${normId(id)}`),
  getFileInfo: (id) => api.get(`/files/${normId(id)}`),
};

// ========== Admin ==========
export const adminService = {
  listUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserRole: (id, userType) => api.patch(`/admin/users/${normId(id)}/role`, { userType }),
  updateUserStatus: (id, isActive) => api.patch(`/admin/users/${normId(id)}/status`, { isActive }),
  deleteUser: (id) => api.delete(`/admin/users/${normId(id)}`),
  listJobs: (params = {}) => api.get('/admin/jobs', { params }),
  updateJobStatus: (id, isActive) => api.patch(`/admin/jobs/${normId(id)}/status`, { isActive }),
  updateJobFeatured: (id, isFeatured) => api.patch(`/admin/jobs/${normId(id)}/featured`, { isFeatured }),
  listCompanies: (params = {}) => api.get('/admin/companies', { params }),
  updateCompanyStatus: (id, isActive) => api.patch(`/admin/companies/${normId(id)}/status`, { isActive }),
  getStats: () => api.get('/admin/stats'),
};

// ========== Analytics (MỚI - CHO DASHBOARD BÁO CÁO) ==========
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getAIPerformance: () => api.get('/analytics/ai-performance'),
  getFunnel: () => api.get('/analytics/funnel'),
  // Sửa: nhận object params (days hoặc months)
  getTrends: (params = {}) => api.get('/analytics/trends', { params }),
  getTopJobs: () => api.get('/analytics/top-jobs'),
};
export default api;