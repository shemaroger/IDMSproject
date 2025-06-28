// src/services/api.js - Updated with enhanced debugging and clinic management
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
      console.error('Logout error:', error);
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

// Enhanced Healthcare API endpoints
export const healthcareAPI = {
  // User Management - Enhanced with clinic support and debugging
  users: {
    list: async (params) => {
      try {
        console.log('📤 API: Fetching users with params:', params);
        const response = await api.get('/users/', { params });
        console.log('✅ Users fetched:', response.data);
        
        // Log clinic data for each user for debugging
        const users = response.data?.results || response.data || [];
        users.forEach(user => {
          if (user.clinics && user.clinics.length > 0) {
            console.log(`User ${user.email} clinics:`, user.clinics);
          }
        });
        
        return response;
      } catch (error) {
        console.error('❌ Error fetching users:', error.response?.data || error.message);
        throw error;
      }
    },

    get: async (id) => {
      try {
        console.log(`📤 API: Fetching user ${id}...`);
        const response = await api.get(`/users/${id}/`);
        console.log(`✅ User ${id} fetched:`, response.data);
        console.log(`User ${id} clinics:`, response.data.clinics);
        return response;
      } catch (error) {
        console.error(`❌ Error fetching user ${id}:`, error.response?.data || error.message);
        throw error;
      }
    },

    create: async (data) => {
      console.log('📤 API: Creating user with data:', data);
      console.log('📤 API: Clinic IDs being sent:', data.clinic_ids);
      
      try {
        const response = await api.post('/users/', data);
        console.log('✅ User created successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ User creation failed:', error.response?.data || error.message);
        if (error.response?.data) {
          console.error('Validation errors:', error.response.data);
        }
        throw error;
      }
    },

    update: async (id, data) => {
      console.log('📤 API: Updating user', id, 'with data:', data);
      console.log('📤 API: Clinic IDs being sent for update:', data.clinic_ids);
      
      try {
        const response = await api.patch(`/users/${id}/`, data);
        console.log('✅ User updated successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ User update failed:', error.response?.data || error.message);
        if (error.response?.data) {
          console.error('Validation errors:', error.response.data);
        }
        throw error;
      }
    },

    delete: (id) => {
      console.log('📤 API: Deleting user', id);
      return api.delete(`/users/${id}/`);
    },

    // Debug method to check clinic assignments
    debugClinics: async (userId) => {
      try {
        const response = await api.get(`/users/${userId}/debug-clinics/`);
        console.log('Debug clinic info:', response.data);
        return response.data;
      } catch (error) {
        console.error('Debug clinics failed:', error);
        throw error;
      }
    },

    // Clinic assignment for medical staff
    assignClinics: (userId, clinicIds) => {
      console.log('📤 API: Assigning clinics', clinicIds, 'to user', userId);
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

  // Enhanced Clinic Management
  clinics: {
    list: async (params) => {
      try {
        console.log('📤 API: Fetching clinics with params:', params);
        const response = await api.get('/clinics/', { params });
        console.log('✅ Clinics fetched:', response.data);
        
        const clinics = response.data?.results || response.data || [];
        console.log(`Found ${clinics.length} clinics:`, clinics.map(c => ({ id: c.id, name: c.name })));
        
        return response;
      } catch (error) {
        console.error('❌ Error fetching clinics:', error.response?.data || error.message);
        throw error;
      }
    },

    get: async (id) => {
      try {
        console.log(`📤 API: Fetching clinic ${id}...`);
        const response = await api.get(`/clinics/${id}/`);
        console.log(`✅ Clinic ${id} fetched:`, response.data);
        return response;
      } catch (error) {
        console.error(`❌ Error fetching clinic ${id}:`, error.response?.data || error.message);
        throw error;
      }
    },

    create: async (data) => {
      console.log('📤 API: Creating clinic with data:', data);
      try {
        const response = await api.post('/clinics/', data);
        console.log('✅ Clinic created successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ Clinic creation failed:', error.response?.data || error.message);
        throw error;
      }
    },

    update: async (id, data) => {
      console.log('📤 API: Updating clinic', id, 'with data:', data);
      try {
        const response = await api.patch(`/clinics/${id}/`, data);
        console.log('✅ Clinic updated successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ Clinic update failed:', error.response?.data || error.message);
        throw error;
      }
    },

    delete: async (id) => {
      console.log('📤 API: Deleting clinic', id);
      try {
        const response = await api.delete(`/clinics/${id}/`);
        console.log('✅ Clinic deleted successfully');
        return response;
      } catch (error) {
        console.error('❌ Clinic deletion failed:', error.response?.data || error.message);
        throw error;
      }
    },

    // Get staff for a specific clinic
    getStaff: async (clinicId) => {
      try {
        console.log(`📤 API: Fetching staff for clinic ${clinicId}...`);
        const response = await api.get(`/clinics/${clinicId}/staff/`);
        console.log(`✅ Staff for clinic ${clinicId}:`, response.data);
        return response;
      } catch (error) {
        console.error(`❌ Error fetching staff for clinic ${clinicId}:`, error.response?.data || error.message);
        throw error;
      }
    },

    // Assign staff to clinic
    assignStaff: async (clinicId, userIds) => {
      console.log(`📤 API: Assigning staff ${userIds} to clinic ${clinicId}`);
      try {
        const response = await api.post(`/clinics/${clinicId}/assign-staff/`, { user_ids: userIds });
        console.log('✅ Staff assigned successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ Staff assignment failed:', error.response?.data || error.message);
        throw error;
      }
    },

    // Remove staff from clinic
    removeStaff: async (clinicId, userIds) => {
      console.log(`📤 API: Removing staff ${userIds} from clinic ${clinicId}`);
      try {
        const response = await api.post(`/clinics/${clinicId}/remove-staff/`, { user_ids: userIds });
        console.log('✅ Staff removed successfully:', response.data);
        return response;
      } catch (error) {
        console.error('❌ Staff removal failed:', error.response?.data || error.message);
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
        console.log('📤 API: Fetching roles...');
        const response = await api.get('/roles/', { params });
        console.log('✅ Roles fetched:', response.data);
        return response;
      } catch (error) {
        console.error('❌ Error fetching roles:', error.response?.data || error.message);
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
  },

  // Patient Management
  patients: {
    list: (params) => api.get('/patients/', { params }),
    get: (id) => api.get(`/patients/${id}/`),
    create: (data) => api.post('/patients/', data),
    update: (id, data) => api.patch(`/patients/${id}/`, data),
    delete: (id) => api.delete(`/patients/${id}/`),
  },

  // Appointments
  appointments: {
    list: (params) => api.get('/appointments/', { params }),
    get: (id) => api.get(`/appointments/${id}/`),
    create: (data) => api.post('/appointments/', data),
    update: (id, data) => api.patch(`/appointments/${id}/`, data),
    delete: (id) => api.delete(`/appointments/${id}/`),
    byClinic: (clinicId, params) => api.get('/appointments/', { 
      params: { ...params, clinic: clinicId } 
    }),
  },

  // Emergency Services
  emergencies: {
    list: (params) => api.get('/emergencies/', { params }),
    get: (id) => api.get(`/emergencies/${id}/`),
    create: (data) => api.post('/emergencies/', data),
    update: (id, data) => api.patch(`/emergencies/${id}/`, data),
  },

  // Symptom Checker
  symptoms: {
    list: (params) => api.get('/symptoms/', { params }),
    get: (id) => api.get(`/symptoms/${id}/`),
  },

  diseases: {
    list: (params) => api.get('/diseases/', { params }),
    get: (id) => api.get(`/diseases/${id}/`),
  },

  symptomChecker: {
    list: () => api.get('/symptom-checks/'),
    create: (data) => api.post('/symptom-checks/', data),
    checkSymptoms: (data) => api.post('/symptom-checks/check_symptoms/', data),
  },

  // Prevention Tips
  preventionTips: {
    list: (params) => api.get('/prevention-tips/', { params }),
    get: (id) => api.get(`/prevention-tips/${id}/`),
    forDisease: (disease) => api.get(`/prevention-tips/for_disease/?disease=${disease}`),
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

  // User Profile - Enhanced profile management
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

// Enhanced Utility functions
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
        console.log('Creating complete user with data:', userData);
        const response = await api.post('/users/', userData);
        return response.data;
      } catch (error) {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    },

    updateCompleteUser: async (userId, userData) => {
      try {
        console.log('Updating complete user:', userId, 'with data:', userData);
        const userResponse = await api.patch(`/users/${userId}/`, {
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          is_active: userData.is_active,
          is_staff: userData.is_staff,
          clinic_ids: userData.clinic_ids || []
        });
        return userResponse.data;
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
  }
};

// Test functions for debugging
window.testClinicData = async () => {
  try {
    console.log('🧪 Testing clinic data loading...');
    
    const clinicsResponse = await healthcareAPI.clinics.list();
    console.log('Clinics response:', clinicsResponse.data);
    
    const usersResponse = await healthcareAPI.users.list();
    console.log('Users response:', usersResponse.data);
    
    const users = usersResponse.data?.results || usersResponse.data || [];
    const medicalStaff = users.filter(u => ['Doctor', 'Nurse'].includes(u.role?.name));
    
    console.log('Medical staff with clinics:', medicalStaff.map(u => ({
      name: `${u.first_name} ${u.last_name}`,
      role: u.role?.name,
      clinics: u.clinics
    })));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

window.testUserClinicFlow = async () => {
  try {
    console.log('🧪 Testing user-clinic flow...');
    
    const usersResponse = await healthcareAPI.users.list();
    console.log('Users:', usersResponse.data);
    
    const clinicsResponse = await healthcareAPI.clinics.list();
    console.log('Clinics:', clinicsResponse.data);
    
    const users = usersResponse.data?.results || usersResponse.data || [];
    const medicalStaff = users.find(u => ['Doctor', 'Nurse'].includes(u.role?.name));
    
    if (medicalStaff) {
      console.log('Found medical staff:', medicalStaff);
      console.log('Their clinics:', medicalStaff.clinics);
      
      try {
        const debugInfo = await healthcareAPI.users.debugClinics(medicalStaff.id);
        console.log('Debug info:', debugInfo);
      } catch (debugError) {
        console.warn('Debug endpoint not available:', debugError);
      }
    } else {
      console.log('No medical staff found for testing');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

export default api;