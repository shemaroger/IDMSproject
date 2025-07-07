// src/services/api.js - CLEAN & FOCUSED VERSION
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error ||
        Object.values(error.response?.data || {}).flat().join(', ') ||
        'Registration failed';
      throw new Error(errorMessage);
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      // Continue with logout even if server call fails
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  isAuthenticated: () => !!localStorage.getItem('authToken'),
  getProfile: () => api.get('/auth/profile/'),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change_password/', { old_password: oldPassword, new_password: newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot_password/', { email }),
};

// Core Healthcare API - Clean CRUD operations
export const healthcareAPI = {
  // Users
  users: {
    list: (params) => api.get('/users/', { params }),
    get: (id) => api.get(`/users/${id}/`),
    create: (data) => api.post('/users/', data),
    update: (id, data) => api.patch(`/users/${id}/`, data),
    delete: (id) => api.delete(`/users/${id}/`),
    assignClinics: (userId, clinicIds) => api.post(`/users/${userId}/assign-clinics/`, { clinic_ids: clinicIds }),
  },
  // Clinics
  clinics: {
    list: (params) => api.get('/clinics/', { params }),
    get: (id) => api.get(`/clinics/${id}/`),
    create: (data) => api.post('/clinics/', data),
    update: (id, data) => api.patch(`/clinics/${id}/`, data),
    delete: (id) => api.delete(`/clinics/${id}/`),
    getStaff: (clinicId) => api.get(`/clinics/${clinicId}/staff/`),
    assignStaff: (clinicId, userIds) => api.post(`/clinics/${clinicId}/assign-staff/`, { user_ids: userIds }),
    removeStaff: (clinicId, userIds) => api.post(`/clinics/${clinicId}/remove-staff/`, { user_ids: userIds }),
  },
  // Roles
  roles: {
    list: (params) => api.get('/roles/', { params }),
    get: (id) => api.get(`/roles/${id}/`),
    create: (data) => api.post('/roles/', data),
    update: (id, data) => api.patch(`/roles/${id}/`, data),
    delete: (id) => api.delete(`/roles/${id}/`),
  },
  // Patients
  patients: {
    list: (params) => api.get('/patients/', { params }),
    get: (id) => api.get(`/patients/${id}/`),
    create: (data) => api.post('/patients/', data),
    update: (id, data) => api.patch(`/patients/${id}/`, data),
    delete: (id) => api.delete(`/patients/${id}/`),
  },
  // Appointments
   // Appointments
   appointments: {
    list: (params) => api.get('/appointments/', { params }),
    get: (id) => api.get(`/appointments/${id}/`),
    create: (data) => api.post('/appointments/', data),
    update: (id, data) => api.patch(`/appointments/${id}/`, data),
    delete: (id) => api.delete(`/appointments/${id}/`),
    // Appointment actions
    approve: (id) => api.post(`/appointments/${id}/approve/`),
    cancel: (id) => api.post(`/appointments/${id}/cancel/`),
    complete: (id, notes = '') => api.post(`/appointments/${id}/complete/`, { notes }),
    // Appointment queries
    myUpcoming: () => api.get('/appointments/my_upcoming/'),
    stats: () => api.get('/appointments/stats/'),
    calendarView: (startDate, endDate) => api.get('/appointments/calendar_view/', {
      params: { start_date: startDate, end_date: endDate }
    }),
  },
  
 // Emergency Requests API - Enhanced version
 emergencies: {
  // Basic CRUD operations
  list: async (params) => {
    try {
      const response = await api.get('/emergency-requests/', { params });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  get: async (id) => {
    try {
      const response = await api.get(`/emergency-requests/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  create: async (data) => {
    try {
      const response = await api.post('/emergency-requests/', data);
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.patch(`/emergency-requests/${id}/`, data);
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/emergency-requests/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // Emergency actions
  approve: async (id, comment = '') => {
    try {
      const response = await api.post(`/emergency-requests/${id}/approve/`, { comment });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  reject: async (id, reason) => {
    try {
      const response = await api.post(`/emergency-requests/${id}/reject/`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  dispatch: async (id, ambulanceId, driverInfo = {}) => {
    try {
      const response = await api.post(`/emergency-requests/${id}/dispatch/`, {
        ambulance_id: ambulanceId,
        ...driverInfo
      });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  updateStatus: async (id, status, metadata = {}) => {
    try {
      const response = await api.patch(`/emergency-requests/${id}/update_status/`, {
        status,
        ...metadata
      });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // Enhanced queries
  getStatistics: async (timeRange) => {
    try {
      const params = timeRange ? {
        start_date: timeRange.start,
        end_date: timeRange.end
      } : {};
      
      const response = await api.get('/emergency-requests/statistics/', { params });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  getTimeline: async (id) => {
    try {
      const response = await api.get(`/emergency-requests/${id}/timeline/`);
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  getByPatient: async (patientId) => {
    try {
      const response = await api.get('/emergency-requests/', {
        params: { patient: patientId }
      });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },
  
  // File attachments
  uploadAttachment: async (id, file, description) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      
      const response = await api.post(`/emergency-requests/${id}/attachments/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // Bulk operations
  bulkUpdateStatus: async (ids, status) => {
    try {
      const response = await api.post('/emergency-requests/bulk_update/', { ids, status });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // Priority management
  updatePriority: async (id, priority) => {
    try {
      const response = await api.post(`/emergency-requests/${id}/update_priority/`, { priority });
      return response.data;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  }
},

  // Prevention Tips
  preventionTips: {
    list: async (params) => {
      try {
        const response = await api.get('/prevention-tips/', { params });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    get: async (id) => {
      try {
        const response = await api.get(`/prevention-tips/${id}/`);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    create: async (data) => {
      try {
        const response = await api.post('/prevention-tips/', data);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    update: async (id, data) => {
      try {
        const response = await api.patch(`/prevention-tips/${id}/`, data);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    delete: async (id) => {
      try {
        const response = await api.delete(`/prevention-tips/${id}/`);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    getByDisease: async (diseaseName) => {
      try {
        const response = await api.get('/prevention-tips/by-disease/', {
          params: { disease: diseaseName }
        });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
  },
  // Notifications
  notifications: {
    list: (params) => api.get('/notifications/', { params }),
    get: (id) => api.get(`/notifications/${id}/`),
    acknowledge: (id) => api.post(`/notifications/${id}/acknowledge/`),
    markAsRead: (id) => api.patch(`/notifications/${id}/`, { is_read: true }),
  },
  // Profiles
  profiles: {
    list: (params) => api.get('/profiles/', { params }),
    get: (id) => api.get(`/profiles/${id}/`),
    create: (data) => api.post('/profiles/', data),
    update: (id, data) => api.patch(`/profiles/${id}/`, data),
    delete: (id) => api.delete(`/profiles/${id}/`),
  },
};

// Utility functions
export const apiUtils = {
  // File upload utility
  uploadFile: async (endpoint, file, additionalData = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Error message formatter
  formatErrorMessage: (error) => {
    if (typeof error === 'string') return error;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'object') {
        return Object.values(data).flat().join(', ');
      }
    }
    return error.message || 'An unexpected error occurred';
  },
  // Role checking utilities
  hasRole: (requiredRole) => {
    const user = authAPI.getCurrentUser();
    return user?.role?.name === requiredRole;
  },
  isPatient: () => apiUtils.hasRole('Patient'),
  isDoctor: () => apiUtils.hasRole('Doctor'),
  isNurse: () => apiUtils.hasRole('Nurse'),
  isAdmin: () => apiUtils.hasRole('Admin'),
  isMedicalStaff: () => {
    const user = authAPI.getCurrentUser();
    return ['Doctor', 'Nurse'].includes(user?.role?.name);
  },
  // Bulk operations
  bulkUpdate: async (endpoint, ids, data) => {
    try {
      const promises = ids.map(id => api.patch(`${endpoint}/${id}/`, data));
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} out of ${ids.length} items`);
      }

      return {
        success: true,
        message: `${ids.length} items updated successfully`,
        results: results.map(r => r.value?.data).filter(Boolean)
      };
    } catch (error) {
      throw new Error(`Bulk update failed: ${error.message}`);
    }
  },
  bulkDelete: async (endpoint, ids) => {
    try {
      const promises = ids.map(id => api.delete(`${endpoint}/${id}/`));
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} out of ${ids.length} items`);
      }

      return {
        success: true,
        message: `${ids.length} items deleted successfully`
      };
    } catch (error) {
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  },
  // Export data
  exportData: async (endpoint, format = 'csv', filters = {}) => {
    try {
      const response = await api.get(`${endpoint}/export/`, {
        params: { format, ...filters },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Export completed successfully' };
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  },
};

export default api;