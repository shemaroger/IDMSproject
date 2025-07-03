// src/services/api.js - CLEAN VERSION
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
  (error) => {
    return Promise.reject(error);
  }
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
      const response = await api.post('/auth/login/', {
        email,
        password,
      });
      
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return { success: true, message: 'Successfully logged out' };
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return { success: true, message: 'Logged out (with cleanup)' };
    }
  },

  logoutLocal: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile/');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch profile');
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change_password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Password change failed');
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot_password/', { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Password reset failed');
    }
  },
};

// Healthcare API endpoints
export const healthcareAPI = {
  // User Management
  users: {
    list: async (params) => {
      try {
        const response = await api.get('/users/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/users/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/users/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/users/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: (id) => {
      return api.delete(`/users/${id}/`);
    },

    // Clinic assignment for medical staff
    assignClinics: (userId, clinicIds) => {
      return api.post(`/users/${userId}/assign-clinics/`, { clinic_ids: clinicIds });
    },

    // Bulk operations
    bulkUpdate: (userIds, data) => {
      const promises = userIds.map(id => api.patch(`/users/${id}/`, data));
      return Promise.all(promises);
    },
    bulkDelete: (userIds) => {
      const promises = userIds.map(id => api.delete(`/users/${id}/`));
      return Promise.all(promises);
    },
    activate: (id) => api.patch(`/users/${id}/`, { is_active: true }),
    deactivate: (id) => api.patch(`/users/${id}/`, { is_active: false }),
  },

  // Clinic Management
  clinics: {
    list: async (params) => {
      try {
        const response = await api.get('/clinics/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/clinics/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/clinics/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/clinics/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await api.delete(`/clinics/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get staff for a specific clinic
    getStaff: async (clinicId) => {
      try {
        const response = await api.get(`/clinics/${clinicId}/staff/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Assign staff to clinic
    assignStaff: async (clinicId, userIds) => {
      try {
        const response = await api.post(`/clinics/${clinicId}/assign-staff/`, { user_ids: userIds });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Remove staff from clinic
    removeStaff: async (clinicId, userIds) => {
      try {
        const response = await api.post(`/clinics/${clinicId}/remove-staff/`, { user_ids: userIds });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Bulk operations for clinics
    bulkDelete: async (clinicIds) => {
      try {
        const promises = clinicIds.map(id => api.delete(`/clinics/${id}/`));
        await Promise.all(promises);
        return { success: true, message: `${clinicIds.length} clinics deleted` };
      } catch (error) {
        throw new Error(`Bulk delete failed: ${error.message}`);
      }
    },

    // Export clinic data
    export: async (format = 'csv') => {
      try {
        const response = await api.get(`/clinics/export/?format=${format}`, {
          responseType: 'blob'
        });
        return response;
      } catch (error) {
        throw new Error(`Export failed: ${error.message}`);
      }
    },
  },

  // Role Management
  roles: {
    list: async (params) => {
      try {
        const response = await api.get('/roles/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },
    get: (id) => api.get(`/roles/${id}/`),
    create: (data) => api.post('/roles/', data),
    update: (id, data) => api.patch(`/roles/${id}/`, data),
    delete: (id) => api.delete(`/roles/${id}/`),
  },

  // User Profiles
  profiles: {
    list: (params) => api.get('/profiles/', { params }),
    get: (id) => api.get(`/profiles/${id}/`),
    create: (data) => api.post('/profiles/', data),
    update: (id, data) => api.patch(`/profiles/${id}/`, data),
    delete: (id) => api.delete(`/profiles/${id}/`),
    
    // Enhanced profile picture methods
    getMyProfile: async () => {
      try {
        const response = await api.get('/profiles/me/');
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    updateMyProfile: async (data) => {
      try {
        const response = await api.patch('/profiles/me/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    uploadProfilePicture: async (file) => {
      try {
        const formData = new FormData();
        formData.append('profile_picture', file);
        
        const response = await api.post('/profiles/me/upload-picture/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    removeProfilePicture: async () => {
      try {
        const response = await api.delete('/profiles/me/remove-picture/');
        return response;
      } catch (error) {
        throw error;
      }
    },
    
    // Update profile with form data (including image)
    updateProfileWithImage: async (formData) => {
      try {
        const response = await api.patch('/profiles/me/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
  },
  
  // Update the existing profile utility methods in apiUtils:
  profile: {
    get: async () => {
      try {
        const response = await healthcareAPI.profiles.getMyProfile();
        return response.data;
      } catch (error) {
        // Fallback to old method if new endpoint doesn't exist
        try {
          const user = authAPI.getCurrentUser();
          const response = await api.get(`/profiles/?user=${user?.id}`);
          return response.data?.results?.[0] || response.data?.[0] || null;
        } catch (fallbackError) {
          throw new Error('Failed to fetch profile');
        }
      }
    },
    
    getByUserId: (userId) => api.get(`/profiles/?user=${userId}`),
    update: (id, data) => api.patch(`/profiles/${id}/`, data),
    create: (data) => api.post('/profiles/', data),
    
    // Enhanced profile picture methods
    uploadPicture: async (file) => {
      try {
        const response = await healthcareAPI.profiles.uploadProfilePicture(file);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    
    removePicture: async () => {
      try {
        const response = await healthcareAPI.profiles.removeProfilePicture();
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    
    updateWithImage: async (formData) => {
      try {
        const response = await healthcareAPI.profiles.updateProfileWithImage(formData);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
    
    // Legacy method for backward compatibility
    updatePicture: async (profileId, file) => {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      return api.patch(`/profiles/${profileId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    
    getCompleteProfile: async () => {
      try {
        const user = authAPI.getCurrentUser();
        const [userResponse, profileResponse] = await Promise.allSettled([
          api.get(`/users/${user?.id}/`),
          healthcareAPI.profiles.getMyProfile()
        ]);
        
        const userData = userResponse.status === 'fulfilled' ? userResponse.value.data : user;
        const profileData = profileResponse.status === 'fulfilled' 
          ? profileResponse.value.data
          : null;
        
        return {
          user: userData,
          profile: profileData
        };
      } catch (error) {
        throw new Error('Failed to fetch complete profile');
      }
    }
  },
  
  // Add profile picture utility functions to apiUtils:
  profilePictureUtils: {
    // Validate image file before upload
    validateImageFile: (file) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and GIF images are allowed');
      }
      
      if (file.size > maxSize) {
        throw new Error('Image file size cannot exceed 5MB');
      }
      
      return true;
    },
    
    // Create image preview URL
    createPreviewUrl: (file) => {
      return URL.createObjectURL(file);
    },
    
    // Cleanup preview URL
    revokePreviewUrl: (url) => {
      URL.revokeObjectURL(url);
    },
    
    // Get default profile image URL
    getDefaultImageUrl: () => '/static/images/default-profile.png',
    
    // Format profile picture URL
    formatProfilePictureUrl: (profile) => {
      if (profile?.profile_picture_url) {
        return profile.profile_picture_url;
      }
      if (profile?.profile_picture) {
        return profile.profile_picture;
      }
      return apiUtils.profilePictureUtils.getDefaultImageUrl();
    },
  },

  // Patient Management
  patients: {
    list: (params) => api.get('/patients/', { params }),
    get: (id) => api.get(`/patients/${id}/`),
    create: (data) => api.post('/patients/', data),
    update: (id, data) => api.patch(`/patients/${id}/`, data),
    delete: (id) => api.delete(`/patients/${id}/`),
  },

  appointments: {
    list: (params) => api.get('/appointments/', { params }),
    get: (id) => api.get(`/appointments/${id}/`),
    create: (data) => api.post('/appointments/', data),
    update: (id, data) => api.patch(`/appointments/${id}/`, data),
    delete: (id) => api.delete(`/appointments/${id}/`),
    
    // Individual appointment actions
    approve: async (id) => {
      try {
        const response = await api.post(`/appointments/${id}/approve/`);
        return response;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to approve appointment');
      }
    },
    
    cancel: async (id) => {
      try {
        const response = await api.post(`/appointments/${id}/cancel/`);
        return response;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to cancel appointment');
      }
    },
    
    complete: async (id, notes = '') => {
      try {
        const response = await api.post(`/appointments/${id}/complete/`, { notes });
        return response;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to complete appointment');
      }
    },
    
    // Appointment queries
    myUpcoming: () => api.get('/appointments/my_upcoming/'),
    stats: () => api.get('/appointments/stats/'),
    calendarView: (startDate, endDate) => api.get('/appointments/calendar_view/', {
      params: { start_date: startDate, end_date: endDate }
    }),
    
    // Filter by clinic and provider
    byClinic: (clinicId, params) => api.get('/appointments/', { 
      params: { ...params, clinic: clinicId } 
    }),
    byProvider: (providerId, params) => api.get('/appointments/', {
      params: { ...params, healthcare_provider: providerId }
    }),
    byPatient: (patientId, params) => api.get('/appointments/', {
      params: { ...params, patient: patientId }
    }),
    
    // Bulk operations - FIXED IMPLEMENTATIONS
    bulkApprove: async (appointmentIds) => {
      try {
        console.log('Bulk approving appointments:', appointmentIds);
        
        // If backend has a bulk approve endpoint, use it
        // Otherwise, use individual API calls
        const promises = appointmentIds.map(async (id) => {
          try {
            return await api.post(`/appointments/${id}/approve/`);
          } catch (error) {
            console.error(`Failed to approve appointment ${id}:`, error);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        // Check if all operations succeeded
        const failed = results.filter(result => result.status === 'rejected');
        const succeeded = results.filter(result => result.status === 'fulfilled');
        
        if (failed.length > 0) {
          console.warn(`${failed.length} appointments failed to approve`);
          throw new Error(`Failed to approve ${failed.length} out of ${appointmentIds.length} appointments`);
        }
        
        return { 
          success: true, 
          message: `${succeeded.length} appointments approved successfully`,
          results: succeeded.map(result => result.value.data)
        };
      } catch (error) {
        console.error('Bulk approve error:', error);
        throw new Error(`Bulk approve failed: ${error.message}`);
      }
    },
    
    bulkCancel: async (appointmentIds) => {
      try {
        console.log('Bulk cancelling appointments:', appointmentIds);
        
        const promises = appointmentIds.map(async (id) => {
          try {
            return await api.post(`/appointments/${id}/cancel/`);
          } catch (error) {
            console.error(`Failed to cancel appointment ${id}:`, error);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        const failed = results.filter(result => result.status === 'rejected');
        const succeeded = results.filter(result => result.status === 'fulfilled');
        
        if (failed.length > 0) {
          console.warn(`${failed.length} appointments failed to cancel`);
          throw new Error(`Failed to cancel ${failed.length} out of ${appointmentIds.length} appointments`);
        }
        
        return { 
          success: true, 
          message: `${succeeded.length} appointments cancelled successfully`,
          results: succeeded.map(result => result.value.data)
        };
      } catch (error) {
        console.error('Bulk cancel error:', error);
        throw new Error(`Bulk cancel failed: ${error.message}`);
      }
    },
    
    bulkComplete: async (appointmentIds, notes = '') => {
      try {
        console.log('Bulk completing appointments:', appointmentIds);
        
        const promises = appointmentIds.map(async (id) => {
          try {
            return await api.post(`/appointments/${id}/complete/`, { notes });
          } catch (error) {
            console.error(`Failed to complete appointment ${id}:`, error);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        const failed = results.filter(result => result.status === 'rejected');
        const succeeded = results.filter(result => result.status === 'fulfilled');
        
        if (failed.length > 0) {
          console.warn(`${failed.length} appointments failed to complete`);
          throw new Error(`Failed to complete ${failed.length} out of ${appointmentIds.length} appointments`);
        }
        
        return { 
          success: true, 
          message: `${succeeded.length} appointments completed successfully`,
          results: succeeded.map(result => result.value.data)
        };
      } catch (error) {
        console.error('Bulk complete error:', error);
        throw new Error(`Bulk complete failed: ${error.message}`);
      }
    },
    
    // Bulk update status (generic function)
    bulkUpdateStatus: async (appointmentIds, status, notes = '') => {
      try {
        console.log(`Bulk updating appointments to ${status}:`, appointmentIds);
        
        const promises = appointmentIds.map(async (id) => {
          try {
            return await api.patch(`/appointments/${id}/`, { 
              status,
              ...(notes && { notes })
            });
          } catch (error) {
            console.error(`Failed to update appointment ${id} to ${status}:`, error);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(promises);
        
        const failed = results.filter(result => result.status === 'rejected');
        const succeeded = results.filter(result => result.status === 'fulfilled');
        
        if (failed.length > 0) {
          console.warn(`${failed.length} appointments failed to update`);
          throw new Error(`Failed to update ${failed.length} out of ${appointmentIds.length} appointments`);
        }
        
        return { 
          success: true, 
          message: `${succeeded.length} appointments updated successfully`,
          results: succeeded.map(result => result.value.data)
        };
      } catch (error) {
        console.error('Bulk update error:', error);
        throw new Error(`Bulk update failed: ${error.message}`);
      }
    },
    
    // Export appointment data
    export: async (format = 'csv', filters = {}) => {
      try {
        const response = await api.get(`/appointments/export/`, {
          params: { format, ...filters },
          responseType: 'blob'
        });
        return response;
      } catch (error) {
        throw new Error(`Export failed: ${error.message}`);
      }
    },
    
    // Get appointment statistics
    getStats: async (dateRange = 'week') => {
      try {
        const response = await api.get('/appointments/statistics/', {
          params: { range: dateRange }
        });
        return response;
      } catch (error) {
        throw new Error(`Failed to get statistics: ${error.message}`);
      }
    },
    
    // Search appointments
    search: async (query, filters = {}) => {
      try {
        const response = await api.get('/appointments/search/', {
          params: { q: query, ...filters }
        });
        return response;
      } catch (error) {
        throw new Error(`Search failed: ${error.message}`);
      }
    }
  },
  
  // Enhanced Emergency Services with Symptom Integration
  emergencies: {
    list: async (params) => {
      try {
        const response = await api.get('/emergency-requests/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/emergency-requests/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/emergency-requests/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/emergency-requests/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await api.delete(`/emergency-requests/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Update emergency request status
    updateStatus: async (id, status, additionalData = {}) => {
      try {
        const response = await api.patch(`/emergency-requests/${id}/update-status/`, {
          status,
          ...additionalData
        });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get emergency requests by suspected disease
    getByDisease: async (disease) => {
      try {
        const response = await api.get('/emergency-requests/by-disease/', {
          params: { disease }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get critical cases from symptom analysis
    getCriticalCases: async () => {
      try {
        const response = await api.get('/emergency-requests/critical-cases/');
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Healthcare Provider Tools for Symptom Management
  providerSymptoms: {
    list: async (params) => {
      try {
        const response = await api.get('/provider-symptoms/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/provider-symptoms/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get urgent cases requiring attention
    getUrgentCases: async () => {
      try {
        const response = await api.get('/provider-symptoms/urgent-cases/');
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Add clinical notes to session
    addClinicalNotes: async (sessionId, notes) => {
      try {
        const response = await api.post(`/provider-symptoms/${sessionId}/clinical-notes/`, { notes });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Mark session as reviewed
    markReviewed: async (sessionId) => {
      try {
        const response = await api.post(`/provider-symptoms/${sessionId}/mark-reviewed/`);
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Enhanced Disease Management with Symptom Analysis
  diseases: {
    list: async (params) => {
      try {
        const response = await api.get('/diseases/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/diseases/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/diseases/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/diseases/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await api.delete(`/diseases/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get symptoms for specific disease
    getSymptoms: async (diseaseId) => {
      try {
        const response = await api.get(`/diseases/${diseaseId}/symptoms/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Analyze symptoms against specific disease
    analyzeSymptoms: async (diseaseId, symptoms) => {
      try {
        const response = await api.post(`/diseases/${diseaseId}/analyze/`, { symptoms });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get all available symptoms across diseases
    getAvailableSymptoms: async () => {
      try {
        const response = await api.get('/diseases/available-symptoms/');
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Bulk create diseases with templates
    bulkCreate: async (data = { create_defaults: true }) => {
      try {
        const response = await api.post('/diseases/bulk-create/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Comprehensive Symptom Checker System
  symptomChecker: {
    // Quick symptom analysis without creating session
    quickCheck: async (symptoms) => {
      try {
        const response = await api.post('/symptom-checker/quick-check/', { symptoms });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Full symptom analysis with session creation
    analyzeSymptoms: async (data) => {
      try {
        const response = await api.post('/symptom-checker/analyze/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get symptom library and reference
    getSymptomLibrary: async () => {
      try {
        const response = await api.get('/symptom-checker/symptoms/');
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get risk assessment guidelines
    getRiskGuide: async () => {
      try {
        const response = await api.get('/symptom-checker/risk-guide/');
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Compare symptoms between diseases
    compareDiseases: async (diseaseIds) => {
      try {
        const response = await api.get('/symptom-checker/compare-diseases/', {
          params: { disease_ids: diseaseIds.join(',') }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get usage statistics
    getStatistics: async (days = 30) => {
      try {
        const response = await api.get('/symptom-checker/statistics/', {
          params: { days }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Symptom Checker Sessions Management
  symptomSessions: {
    list: async (params) => {
      try {
        const response = await api.get('/symptom-sessions/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/symptom-sessions/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/symptom-sessions/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/symptom-sessions/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await api.delete(`/symptom-sessions/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Add custom symptom to existing session
    addSymptom: async (sessionId, symptom) => {
      try {
        const response = await api.post(`/symptom-sessions/${sessionId}/add-symptom/`, { symptom });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Re-run analysis for session
    reanalyze: async (sessionId) => {
      try {
        const response = await api.post(`/symptom-sessions/${sessionId}/reanalyze/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Create emergency request from session
    requestEmergency: async (sessionId, data) => {
      try {
        const response = await api.post(`/symptom-sessions/${sessionId}/request-emergency/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Disease Analysis Results
  diseaseAnalyses: {
    list: async (params) => {
      try {
        const response = await api.get('/disease-analyses/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/disease-analyses/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get analyses for specific session
    getBySession: async (sessionId) => {
      try {
        const response = await api.get('/disease-analyses/', {
          params: { session_id: sessionId }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Enhanced Prevention Tips
  preventionTips: {
    list: async (params) => {
      try {
        const response = await api.get('/prevention-tips/', { params });
        return response;
      } catch (error) {
        throw error;
      }
    },

    get: async (id) => {
      try {
        const response = await api.get(`/prevention-tips/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    create: async (data) => {
      try {
        const response = await api.post('/prevention-tips/', data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const response = await api.patch(`/prevention-tips/${id}/`, data);
        return response;
      } catch (error) {
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const response = await api.delete(`/prevention-tips/${id}/`);
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Get tips by disease with category grouping
    getByDisease: async (diseaseName) => {
      try {
        const response = await api.get('/prevention-tips/by-disease/', {
          params: { disease: diseaseName }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Filter tips by category
    getByCategory: async (category) => {
      try {
        const response = await api.get('/prevention-tips/', {
          params: { category }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },

    // Filter tips by disease type
    getByDiseaseType: async (diseaseType) => {
      try {
        const response = await api.get('/prevention-tips/', {
          params: { disease_type: diseaseType }
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
  },

  // Alerts and Notifications
  alerts: {
    list: (params) => api.get('/alerts/', { params }),
    get: (id) => api.get(`/alerts/${id}/`),
  },

  notifications: {
    list: (params) => api.get('/notifications/', { params }),
    get: (id) => api.get(`/notifications/${id}/`),
    acknowledge: (id) => api.post(`/notifications/${id}/acknowledge/`),
  },

  // User Profile
  profile: {
    get: async () => {
      try {
        const user = authAPI.getCurrentUser();
        const response = await api.get(`/profiles/?user=${user?.id}`);
        return response.data?.results?.[0] || response.data?.[0] || null;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to fetch profile');
      }
    },
    
    getByUserId: (userId) => api.get(`/profiles/?user=${userId}`),
    update: (id, data) => api.patch(`/profiles/${id}/`, data),
    create: (data) => api.post('/profiles/', data),
    
    updatePicture: async (profileId, file) => {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      return api.patch(`/profiles/${profileId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    
    getCompleteProfile: async () => {
      try {
        const user = authAPI.getCurrentUser();
        const [userResponse, profileResponse] = await Promise.allSettled([
          api.get(`/users/${user?.id}/`),
          api.get(`/profiles/?user=${user?.id}`)
        ]);
        
        const userData = userResponse.status === 'fulfilled' ? userResponse.value.data : user;
        const profileData = profileResponse.status === 'fulfilled' 
          ? (profileResponse.value.data?.results?.[0] || profileResponse.value.data?.[0])
          : null;
        
        return {
          user: userData,
          profile: profileData
        };
      } catch (error) {
        throw new Error('Failed to fetch complete profile');
      }
    }
  },
};

// Utility functions
export const apiUtils = {
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

  hasRole: (requiredRole) => {
    const user = authAPI.getCurrentUser();
    return user?.role?.name === requiredRole;
  },

  isPatient: () => apiUtils.hasRole('Patient'),
  isHealthcareWorker: () => {
    const user = authAPI.getCurrentUser();
    return ['Doctor', 'Nurse'].includes(user?.role?.name);
  },
  isAdmin: () => apiUtils.hasRole('Admin'),

  // Enhanced user management utilities
  userUtils: {
    createCompleteUser: async (userData) => {
      try {
        const response = await healthcareAPI.users.create(userData);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    updateCompleteUser: async (userId, userData) => {
      try {
        const response = await healthcareAPI.users.update(userId, userData);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    getUsersByClinic: async (clinicId) => {
      try {
        const response = await api.get('/users/', {
          params: { clinics__id: clinicId }
        });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    getMedicalStaff: async (clinicId = null) => {
      try {
        const params = { role__name__in: ['Doctor', 'Nurse'] };
        if (clinicId) {
          params.clinics__id = clinicId;
        }
        
        const response = await api.get('/users/', { params });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    activateUsers: async (userIds) => {
      try {
        const promises = userIds.map(id => 
          api.patch(`/users/${id}/`, { is_active: true })
        );
        await Promise.all(promises);
        return { success: true, message: `${userIds.length} users activated` };
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    deactivateUsers: async (userIds) => {
      try {
        const promises = userIds.map(id => 
          api.patch(`/users/${id}/`, { is_active: false })
        );
        await Promise.all(promises);
        return { success: true, message: `${userIds.length} users deactivated` };
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    deleteUsers: async (userIds) => {
      try {
        const promises = userIds.map(id => api.delete(`/users/${id}/`));
        await Promise.all(promises);
        return { success: true, message: `${userIds.length} users deleted` };
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    toggleUserStatus: async (userId, currentStatus) => {
      try {
        const response = await api.patch(`/users/${userId}/`, { 
          is_active: !currentStatus 
        });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },
  },

  // 🆕 Symptom Checker Utilities
  symptomUtils: {
    // Initialize default diseases
    initializeDefaultDiseases: async () => {
      try {
        const response = await healthcareAPI.diseases.bulkCreate({ create_defaults: true });
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    // Quick symptom assessment
    quickAssessment: async (symptoms) => {
      try {
        const response = await healthcareAPI.symptomChecker.quickCheck(symptoms);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    // Full symptom analysis workflow
    fullAnalysis: async (symptomsData) => {
      try {
        const response = await healthcareAPI.symptomChecker.analyzeSymptoms(symptomsData);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    // Get emergency recommendations
    getEmergencyRecommendations: async (sessionId) => {
      try {
        const session = await healthcareAPI.symptomSessions.get(sessionId);
        const sessionData = session.data;
        
        if (sessionData.severity_level === 'critical') {
          return {
            immediate_action: 'Seek emergency medical care immediately',
            recommendation: 'Go to nearest hospital or call emergency services',
            risk_level: 'CRITICAL',
            should_call_emergency: true
          };
        } else if (sessionData.severity_level === 'severe') {
          return {
            immediate_action: 'Seek medical attention today',
            recommendation: 'Contact your doctor or visit a clinic promptly',
            risk_level: 'HIGH',
            should_call_emergency: false
          };
        }
        
        return {
          immediate_action: sessionData.recommendation,
          risk_level: sessionData.severity_level?.toUpperCase(),
          should_call_emergency: false
        };
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    // Get prevention tips for analysis results
    getPreventionTipsForSession: async (sessionId) => {
      try {
        const session = await healthcareAPI.symptomSessions.get(sessionId);
        const sessionData = session.data;
        
        if (sessionData.primary_disease_name) {
          const tips = await healthcareAPI.preventionTips.getByDisease(sessionData.primary_disease_name);
          return tips.data;
        }
        
        return { tips_by_category: {}, total_tips: 0 };
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    // Format symptom analysis results for display
    formatAnalysisResults: (analysisData) => {
      return {
        summary: {
          risk_score: analysisData.overall_risk_score,
          severity: analysisData.severity_level,
          primary_disease: analysisData.primary_suspected_disease,
          emergency_needed: analysisData.emergency_recommended,
          clinic_visit_needed: analysisData.nearest_clinic_recommended
        },
        detailed_results: analysisData.disease_analyses || [],
        recommendations: {
          immediate: analysisData.recommendation,
          follow_up: analysisData.needs_followup,
          follow_up_date: analysisData.followup_date
        },
        prevention_tips: analysisData.prevention_tips || []
      };
    },

    // Check if symptoms warrant emergency care
    isEmergencyCase: (symptoms) => {
      const emergencySymptoms = [
        'difficulty_breathing', 'chest_pain', 'confusion', 'seizures',
        'blue_lips_or_fingernails', 'severe_chest_pain', 'loss_of_consciousness'
      ];
      
      return symptoms.some(symptom => 
        emergencySymptoms.some(emergency => 
          symptom.toLowerCase().includes(emergency.toLowerCase())
        )
      );
    },

    // Get symptom severity category
    getSymptomSeverity: async (symptoms) => {
      try {
        const analysis = await healthcareAPI.symptomChecker.quickCheck(symptoms);
        const results = analysis.data.results || [];
        
        if (results.length === 0) return 'mild';
        
        const highestSeverity = results.reduce((max, current) => {
          const severityOrder = { mild: 1, moderate: 2, severe: 3, critical: 4 };
          return severityOrder[current.severity] > severityOrder[max] ? current.severity : max;
        }, 'mild');
        
        return highestSeverity;
      } catch (error) {
        return 'mild'; // Default to mild if analysis fails
      }
    }
  }
};

export default api;