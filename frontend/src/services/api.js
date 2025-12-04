import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_DURATION) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const clearCache = () => cache.clear();

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
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

// Helper to extract array from paginated response
const extractData = (data) => {
  // If it's a paginated response with 'results' key, return results
  if (data && typeof data === 'object' && 'results' in data) {
    return data.results;
  }
  // Otherwise return as-is (already an array or other format)
  return data;
};

// Cached GET request helper
const cachedGet = async (url, params = {}, cacheKey = null) => {
  const key = cacheKey || `${url}:${JSON.stringify(params)}`;
  const cached = getCached(key);
  if (cached) {
    return { data: cached, fromCache: true };
  }
  const response = await api.get(url, { params });
  // Extract array from paginated response before caching
  const dataToCache = extractData(response.data);
  setCache(key, dataToCache);
  return { ...response, data: dataToCache };
};

// GET request that returns array (handles pagination)
const getArray = async (url, params = {}) => {
  const response = await api.get(url, { params });
  return { ...response, data: extractData(response.data) };
};

// Auth APIs
export const authAPI = {
  checkAdmin: () => cachedGet('/auth/check-admin/', {}, 'check-admin'),
  adminSignup: (data) => api.post('/auth/admin-signup/', data),
  login: (data) => api.post('/auth/login/', data),
  requestOTP: (data) => api.post('/auth/otp/request/', data),
  verifyOTP: (data) => api.post('/auth/otp/verify/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => {
    clearCache();
    return api.patch('/auth/profile/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  changePassword: (data) => api.post('/auth/change-password/', data),
  getEmployees: () => cachedGet('/auth/employees/', {}, 'employees'),
  createEmployee: (data) => {
    clearCache();
    return api.post('/auth/employees/', data);
  },
  updateEmployee: (id, data) => {
    clearCache();
    return api.patch(`/auth/employees/${id}/`, data);
  },
  deleteEmployee: (id) => {
    clearCache();
    return api.delete(`/auth/employees/${id}/`);
  },
  getEmployee: (id) => api.get(`/auth/employees/${id}/`),
  getDashboardStats: () => cachedGet('/auth/dashboard-stats/', {}, 'dashboard-stats'),
  getTodayEmployeeStatus: () => api.get('/auth/today-employee-status/'),
  // Notifications
  getNotifications: () => getArray('/auth/notifications/'),
  getUnreadCount: () => api.get('/auth/notifications/unread-count/'),
  markNotificationRead: (id) => api.post(`/auth/notifications/read/${id}/`),
  markAllNotificationsRead: () => api.post('/auth/notifications/read-all/'),
  clearNotifications: () => api.post('/auth/notifications/clear/'),
  // Profile Update Requests
  submitProfileUpdateRequest: (data) => api.post('/auth/profile/update-request/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyProfileRequests: () => getArray('/auth/profile/my-requests/'),
  cancelProfileRequest: (id) => api.post(`/auth/profile/cancel-request/${id}/`),
  // Admin - Profile Update Requests
  getAllProfileRequests: (params) => getArray('/auth/profile/all-requests/', params),
  reviewProfileRequest: (id, data) => api.post(`/auth/profile/review/${id}/`, data),
};

// Attendance APIs
export const attendanceAPI = {
  punchIn: (data) => {
    clearCache();
    return api.post('/attendance/punch-in/', data);
  },
  punchOut: (data) => {
    clearCache();
    return api.post('/attendance/punch-out/', data);
  },
  getToday: () => api.get('/attendance/today/'),
  getMyAttendance: (params) => cachedGet('/attendance/my-attendance/', params),
  getAllAttendance: (params) => getArray('/attendance/all/', params),
  getReport: (params) => api.get('/attendance/report/', { params }),
  exportCSV: (params) => api.get('/attendance/export/', { params, responseType: 'blob' }),
  getOffDayStats: (params) => cachedGet('/attendance/off-day-stats/', params),
  getLocations: () => cachedGet('/attendance/locations/', {}, 'locations'),
  createLocation: (data) => {
    clearCache();
    return api.post('/attendance/locations/', data);
  },
  updateLocation: (id, data) => {
    clearCache();
    return api.patch(`/attendance/locations/${id}/`, data);
  },
  deleteLocation: (id) => {
    clearCache();
    return api.delete(`/attendance/locations/${id}/`);
  },
  // Regularization
  applyRegularization: (data) => api.post('/attendance/regularization/apply/', data),
  getMyRegularizations: () => getArray('/attendance/regularization/my-requests/'),
  getAllRegularizations: (params) => getArray('/attendance/regularization/all/', params),
  reviewRegularization: (id, data) => api.post(`/attendance/regularization/review/${id}/`, data),
  cancelRegularization: (id) => api.post(`/attendance/regularization/cancel/${id}/`),
  // WFH (Work From Home)
  applyWFH: (data) => api.post('/attendance/wfh/apply/', data),
  getMyWFH: () => getArray('/attendance/wfh/my-requests/'),
  getAllWFH: (params) => getArray('/attendance/wfh/all/', params),
  reviewWFH: (id, data) => api.post(`/attendance/wfh/review/${id}/`, data),
  cancelWFH: (id) => api.post(`/attendance/wfh/cancel/${id}/`),
  getTodayWFHStatus: () => api.get('/attendance/wfh/today-status/'),
  // Admin Attendance Management
  adminAddAttendance: (data) => {
    clearCache();
    return api.post('/attendance/admin/add/', data);
  },
  adminUpdateAttendance: (id, data) => {
    clearCache();
    return api.patch(`/attendance/admin/update/${id}/`, data);
  },
  adminMarkAbsent: (data) => {
    clearCache();
    return api.post('/attendance/admin/mark-absent/', data);
  },
  adminBulkUpdate: (data) => {
    clearCache();
    return api.post('/attendance/admin/bulk-update/', data);
  },
  adminClearPunchOut: (id) => {
    clearCache();
    return api.post(`/attendance/admin/clear-punch-out/${id}/`);
  },
  // Shift Management (Admin)
  getShifts: () => cachedGet('/attendance/shifts/', {}, 'shifts'),
  createShift: (data) => {
    clearCache();
    return api.post('/attendance/shifts/', data);
  },
  updateShift: (id, data) => {
    clearCache();
    return api.patch(`/attendance/shifts/${id}/`, data);
  },
  deleteShift: (id) => {
    clearCache();
    return api.delete(`/attendance/shifts/${id}/`);
  },
  assignShift: (data) => {
    clearCache();
    return api.post('/attendance/shifts/assign/', data);
  },
  // Comp Off
  getMyCompOffs: () => getArray('/attendance/comp-off/my/'),
  getAllCompOffs: (params) => getArray('/attendance/comp-off/all/', params),
  getCompOffBalance: (params) => api.get('/attendance/comp-off/balance/', { params }),
  useCompOff: (data) => {
    clearCache();
    return api.post('/attendance/comp-off/use/', data);
  },
  adminCreateCompOff: (data) => {
    clearCache();
    return api.post('/attendance/comp-off/admin/create/', data);
  },
  // Reduce LOP using Comp Off
  getReduceLOPOptions: () => api.get('/attendance/comp-off/reduce-lop/'),
  useCompOffToReduceLOP: (data) => {
    clearCache();
    return api.post('/attendance/comp-off/reduce-lop/', data);
  },
};

// Leave APIs
export const leaveAPI = {
  getTypes: () => cachedGet('/leaves/types/', {}, 'leave-types'),
  createType: (data) => {
    clearCache();
    return api.post('/leaves/types/', data);
  },
  getMyBalance: (params) => cachedGet('/leaves/my-balance/', params),
  applyLeave: (data) => {
    clearCache();
    return api.post('/leaves/apply/', data);
  },
  getMyRequests: () => getArray('/leaves/my-requests/'),
  cancelRequest: (id) => {
    clearCache();
    return api.post(`/leaves/cancel/${id}/`);
  },
  getAllRequests: (params) => getArray('/leaves/all-requests/', params),
  reviewRequest: (id, data) => {
    clearCache();
    return api.post(`/leaves/review/${id}/`, data);
  },
  updateRequest: (id, data) => api.patch(`/leaves/update-request/${id}/`, data),
  getAllBalances: (params) => getArray('/leaves/all-balances/', params),
  updateBalance: (id, data) => api.patch(`/leaves/update-balance/${id}/`, data),
  initializeBalances: (data) => api.post('/leaves/initialize/', data),
  monthlyCredit: () => api.post('/leaves/monthly-credit/'),
  newYearReset: (data) => api.post('/leaves/new-year-reset/', data),
  exportCSV: (params) => api.get('/leaves/export/', { params, responseType: 'blob' }),
  getHolidays: () => cachedGet('/leaves/holidays/', {}, 'holidays'),
  createHoliday: (data) => {
    clearCache();
    return api.post('/leaves/holidays/', data);
  },
  deleteHoliday: (id) => {
    clearCache();
    return api.delete(`/leaves/holidays/${id}/`);
  },
  // Leave-Punch conflict handling
  checkTodayLeave: () => api.get('/leaves/check-today-leave/'),
  cancelLeaveForDate: (data) => api.post('/leaves/cancel-leave-for-date/', data),
};

export default api;
