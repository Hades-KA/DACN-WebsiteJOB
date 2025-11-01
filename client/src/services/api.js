import axios from 'axios';

// Create axios instance with base configuration
const apiBase = `${(import.meta?.env?.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '')}/api`;
const api = axios.create({
  baseURL: apiBase,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    console.log('Using token:', token ? 'Token exists' : 'No token');
    console.log('Request headers:', config.headers);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization header set with token');
    } else {
      console.warn('No authentication token found');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url);
    console.error('Error details:', error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Job Services
export const jobService = {
  getAllJobs: (params = {}) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  createJob: (jobData) => api.post('/jobs', jobData),
  updateJob: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  searchJobs: (searchParams) => api.get('/jobs/search', { params: searchParams }),
  getJobsByCompany: (companyId) => api.get(`/jobs/company/${companyId}`),
  applyJob: (jobId, applicationData) => api.post(`/jobs/${jobId}/apply`, applicationData),
  getJobApplications: (jobId) => api.get(`/jobs/${jobId}/applications`),
};

// CV Services
export const cvService = {
  getAllCVs: (params = {}) => api.get('/cvs', { params }),
  getCVById: (id) => api.get(`/cvs/${id}`),
  uploadCV: (formData) => api.post('/cvs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateCV: (id, cvData) => api.put(`/cvs/${id}`, cvData),
  deleteCV: (id) => api.delete(`/cvs/${id}`),
  searchCVs: (searchParams) => api.get('/cvs/search', { params: searchParams }),
  downloadCV: (id) => api.get(`/cvs/${id}/download`, { responseType: 'blob' }),
  analyzeCV: (id) => api.post(`/cvs/${id}/analyze`),
  getCVAnalysis: (id) => api.get(`/cvs/${id}/analysis`),
};

// User Services
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => {
    console.log('Updating profile with data:', userData);
    return api.put('/users/profile', userData);
  },
  changePassword: (passwordData) => api.put('/users/password', passwordData),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getUsers: (params = {}) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Dashboard Services
export const dashboardService = {
  getDashboardData: () => api.get('/dashboard'),
  getStats: () => api.get('/dashboard/stats'),
  getRecentJobs: () => api.get('/dashboard/recent-jobs'),
  getTopCandidates: () => api.get('/dashboard/top-candidates'),
  getAIInsights: () => api.get('/dashboard/ai-insights'),
  getAnalytics: (period = '30d') => api.get(`/dashboard/analytics?period=${period}`),
};

// AI/ML Services
export const aiService = {
  analyzeCV: (cvId) => api.post(`/ai/analyze-cv/${cvId}`),
  predictPerformance: (candidateId, jobId) => api.post('/ai/predict-performance', {
    candidateId,
    jobId,
  }),
  getJobRecommendations: (candidateId) => api.get(`/ai/job-recommendations/${candidateId}`),
  getCandidateRecommendations: (jobId) => api.get(`/ai/candidate-recommendations/${jobId}`),
  analyzeJobMatch: (cvId, jobId) => api.post('/ai/analyze-job-match', { cvId, jobId }),
  getSkillGaps: (candidateId, jobId) => api.get(`/ai/skill-gaps/${candidateId}/${jobId}`),
  generateJobDescription: (jobData) => api.post('/ai/generate-job-description', jobData),
  optimizeJobPosting: (jobId) => api.post(`/ai/optimize-job-posting/${jobId}`),
};

// Company Services
export const companyService = {
  getCompanies: (params = {}) => api.get('/companies', { params }),
  getCompanyById: (id) => api.get(`/companies/${id}`),
  createCompany: (companyData) => api.post('/companies', companyData),
  updateCompany: (id, companyData) => api.put(`/companies/${id}`, companyData),
  deleteCompany: (id) => api.delete(`/companies/${id}`),
  getCompanyJobs: (id) => api.get(`/companies/${id}/jobs`),
  getCompanyStats: (id) => api.get(`/companies/${id}/stats`),
};

// Application Services
export const applicationService = {
  getApplications: (params = {}) => api.get('/applications', { params }),
  getApplicationById: (id) => api.get(`/applications/${id}`),
  createApplication: (applicationData) => api.post('/applications', applicationData),
  updateApplication: (id, applicationData) => api.put(`/applications/${id}`, applicationData),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
  updateApplicationStatus: (id, status) => api.put(`/applications/${id}/status`, { status }),
  getApplicationsByJob: (jobId) => api.get(`/applications/job/${jobId}`),
  getApplicationsByCandidate: (candidateId) => api.get(`/applications/candidate/${candidateId}`),
};

// Notification Services
export const notificationService = {
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  createNotification: (notificationData) => api.post('/notifications', notificationData),
};

// File Services
export const fileService = {
  uploadFile: (formData) => api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  downloadFile: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  deleteFile: (id) => api.delete(`/files/${id}`),
  getFileInfo: (id) => api.get(`/files/${id}`),
};

// Admin Services
export const adminService = {
  // Users
  listUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserRole: (id, userType) => api.patch(`/admin/users/${id}/role`, { userType }),
  updateUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // Jobs
  listJobs: (params = {}) => api.get('/admin/jobs', { params }),
  updateJobStatus: (id, isActive) => api.patch(`/admin/jobs/${id}/status`, { isActive }),
  updateJobFeatured: (id, isFeatured) => api.patch(`/admin/jobs/${id}/featured`, { isFeatured }),
  // Companies
  listCompanies: (params = {}) => api.get('/admin/companies', { params }),
  updateCompanyStatus: (id, isActive) => api.patch(`/admin/companies/${id}/status`, { isActive }),
  // Stats
  getStats: () => api.get('/admin/stats'),
};

export default api;