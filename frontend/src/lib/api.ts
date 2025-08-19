import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data: any) => api.post('/api/auth/register', data),
  verifyOTP: (data: any) => api.post('/api/auth/verify-otp', data),
  login: (data: any) => api.post('/api/auth/login', data),
  loginVerify: (data: any) => api.post('/api/auth/login-verify', data),
  officerLogin: (data: any) => api.post('/api/officer/login', data),
};

// User API calls
export const userAPI = {
  getProfile: (userID: string) => api.get(`/api/user/${userID}`),
  updateProfile: (userID: string, data: any) => api.patch(`/api/user/${userID}/profile`, data),
  reportGrievance: (userID: string, data: any) => api.post(`/api/user/${userID}/report_grievance`, data),
  reportSuspicious: (userID: string, data: any) => api.post(`/api/user/${userID}/report_suspicious`, data),
};

// Reports API calls
export const reportsAPI = {
  getReports: (params?: any) => api.get('/api/reports', { params }),
  updateReport: (id: string, data: any) => api.put(`/api/reports/${id}`, data),
  deleteReport: (id: string) => api.delete(`/api/reports/${id}`),
};

// AI API calls
export const aiAPI = {
  analyzeComplaint: (data: any) => api.post('/api/ai/analyze-complaint', data),
  checkSimilarity: (data: any) => api.post('/api/ai/check-similarity-advanced', data),
  detectContradiction: (data: any) => api.post('/api/ai/contradiction', data),
  chat: (data: any) => api.post('/api/ai/chat-enhanced', data),
  analyzeAudio: (data: any) => api.post('/api/ai/analyze-audio', data),
  analyzeVideo: (data: any) => api.post('/api/ai/analyze-video', data),
  analyzeImage: (data: any) => api.post('/api/ai/analyze-image', data),
  analyzePdf: (data: any) => api.post('/api/ai/analyze-pdf', data),
  detectCallScam: (data: any) => api.post('/api/ai/detect-call-scam', data),
  completeAnalysis: (data: any) => api.post('/api/ai/complete-analysis', data),
};

// Meta API calls
export const metaAPI = {
  getComplaintCategories: () => api.get('/api/meta/complaint-categories'),
  getSuspiciousEntityTypes: () => api.get('/api/meta/suspicious-entity-types'),
};

// Officer API calls
export const officerAPI = {
  getDataRequests: () => api.get('/api/data-requests'),
  createDataRequest: (data: any) => api.post('/api/data-request', data),
  getDashboard: () => api.get('/api/admin/dashboard'),
};

export default api;