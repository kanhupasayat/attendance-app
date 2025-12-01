import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  checkAdmin: () => api.get('/auth/check-admin/'),
  adminSignup: (data) => api.post('/auth/admin-signup/', data),
  login: (data) => api.post('/auth/login/', data),
  requestOTP: (data) => api.post('/auth/otp/request/', data),
  verifyOTP: (data) => api.post('/auth/otp/verify/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getEmployees: () => api.get('/auth/employees/'),
  createEmployee: (data) => api.post('/auth/employees/', data),
  updateEmployee: (id, data) => api.patch(`/auth/employees/${id}/`, data),
  deleteEmployee: (id) => api.delete(`/auth/employees/${id}/`),
  getDashboardStats: () => api.get('/auth/dashboard-stats/'),
  // Notifications
  getNotifications: () => api.get('/auth/notifications/'),
  getUnreadCount: () => api.get('/auth/notifications/unread-count/'),
  markNotificationRead: (id) => api.post(`/auth/notifications/read/${id}/`),
  markAllNotificationsRead: () => api.post('/auth/notifications/read-all/'),
  clearNotifications: () => api.post('/auth/notifications/clear/'),
  // Profile Update Requests
  submitProfileUpdateRequest: (data) => api.post('/auth/profile/update-request/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyProfileRequests: () => api.get('/auth/profile/my-requests/'),
  cancelProfileRequest: (id) => api.post(`/auth/profile/cancel-request/${id}/`),
  // Admin - Profile Update Requests
  getAllProfileRequests: (params) => api.get('/auth/profile/all-requests/', { params }),
  reviewProfileRequest: (id, data) => api.post(`/auth/profile/review/${id}/`, data),
};

// Attendance APIs
export const attendanceAPI = {
  punchIn: (data) => api.post('/attendance/punch-in/', data),
  punchOut: (data) => api.post('/attendance/punch-out/', data),
  getToday: () => api.get('/attendance/today/'),
  getMyAttendance: (params) => api.get('/attendance/my-attendance/', { params }),
  getAllAttendance: (params) => api.get('/attendance/all/', { params }),
  getReport: (params) => api.get('/attendance/report/', { params }),
  exportCSV: (params) => api.get('/attendance/export/', { params, responseType: 'blob' }),
  getOffDayStats: (params) => api.get('/attendance/off-day-stats/', { params }),
  getLocations: () => api.get('/attendance/locations/'),
  createLocation: (data) => api.post('/attendance/locations/', data),
  updateLocation: (id, data) => api.patch(`/attendance/locations/${id}/`, data),
  deleteLocation: (id) => api.delete(`/attendance/locations/${id}/`),
  // Regularization
  applyRegularization: (data) => api.post('/attendance/regularization/apply/', data),
  getMyRegularizations: () => api.get('/attendance/regularization/my-requests/'),
  getAllRegularizations: (params) => api.get('/attendance/regularization/all/', { params }),
  reviewRegularization: (id, data) => api.post(`/attendance/regularization/review/${id}/`, data),
  cancelRegularization: (id) => api.post(`/attendance/regularization/cancel/${id}/`),
};

// Leave APIs
export const leaveAPI = {
  getTypes: () => api.get('/leaves/types/'),
  createType: (data) => api.post('/leaves/types/', data),
  getMyBalance: (params) => api.get('/leaves/my-balance/', { params }),
  applyLeave: (data) => api.post('/leaves/apply/', data),
  getMyRequests: () => api.get('/leaves/my-requests/'),
  cancelRequest: (id) => api.post(`/leaves/cancel/${id}/`),
  getAllRequests: (params) => api.get('/leaves/all-requests/', { params }),
  reviewRequest: (id, data) => api.post(`/leaves/review/${id}/`, data),
  updateRequest: (id, data) => api.patch(`/leaves/update-request/${id}/`, data),
  getAllBalances: (params) => api.get('/leaves/all-balances/', { params }),
  updateBalance: (id, data) => api.patch(`/leaves/update-balance/${id}/`, data),
  initializeBalances: (data) => api.post('/leaves/initialize/', data),
  monthlyCredit: () => api.post('/leaves/monthly-credit/'),
  newYearReset: (data) => api.post('/leaves/new-year-reset/', data),
  exportCSV: (params) => api.get('/leaves/export/', { params, responseType: 'blob' }),
  getHolidays: () => api.get('/leaves/holidays/'),
  createHoliday: (data) => api.post('/leaves/holidays/', data),
  deleteHoliday: (id) => api.delete(`/leaves/holidays/${id}/`),
  // Leave-Punch conflict handling
  checkTodayLeave: () => api.get('/leaves/check-today-leave/'),
  cancelLeaveForDate: (data) => api.post('/leaves/cancel-leave-for-date/', data),
};

export default api;
