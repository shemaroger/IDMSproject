// src/services/api.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base API configuration
const api = axios.create({
  baseURL: 'http://192.168.8.107:8000/api/', // Replace with your Django server URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add auth token to requests if available
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
  } catch (error) {
    console.error('Error retrieving auth token:', error);
  }
  return config;
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, remove it
      try {
        await SecureStore.deleteItemAsync('authToken');
      } catch (e) {
        console.error('Error removing invalid token:', e);
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
const AuthAPI = {
  /**
   * Patient Login
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise} Axios response
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password
      });
      
      // Store token securely
      if (response.data.token) {
        await SecureStore.setItemAsync('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Patient Registration
   * @param {object} userData - Patient registration data
   * @returns {Promise} Axios response
   */
  async register(userData) {
    try {
      // Ensure role is set to Patient
      const data = {
        ...userData,
        role: 'Patient' // Force Patient role for registration
      };
      
      const response = await api.post('/auth/register/', data);
      
      // Store token if registration includes auto-login
      if (response.data.token) {
        await SecureStore.setItemAsync('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get current patient profile
   * @returns {Promise} Axios response
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/profile/');
      return response.data;
    } catch (error) {
      console.error('Profile fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Update patient profile
   * @param {object} profileData - Profile data to update
   * @returns {Promise} Axios response
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile/', profileData);
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Logout current user
   * @returns {Promise} 
   */
  async logout() {
    try {
      // Remove token from secure storage
      await SecureStore.deleteItemAsync('authToken');
      
      // Optionally call backend logout endpoint
      await api.post('/auth/logout/');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      // Don't throw on logout error, just log it
      return { success: false };
    }
  },

  /**
   * Forgot password request
   * @param {string} email 
   * @returns {Promise} 
   */
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot_password/', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Change password
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @returns {Promise} 
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await api.post('/auth/change_password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Utility functions for error handling
const apiUtils = {
  /**
   * Format error message from API response
   * @param {Error} error 
   * @returns {string} Formatted error message
   */
  formatErrorMessage(error) {
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // Handle different error response formats
      if (typeof errorData === 'string') {
        return errorData;
      }
      
      if (errorData.message) {
        return errorData.message;
      }
      
      if (errorData.error) {
        return errorData.error;
      }
      
      if (errorData.detail) {
        return errorData.detail;
      }
      
      // Handle validation errors
      if (errorData.errors) {
        const firstError = Object.values(errorData.errors)[0];
        return Array.isArray(firstError) ? firstError[0] : firstError;
      }
      
      // Handle field-specific errors
      const fieldErrors = Object.keys(errorData).filter(key => 
        Array.isArray(errorData[key]) && errorData[key].length > 0
      );
      
      if (fieldErrors.length > 0) {
        const firstField = fieldErrors[0];
        return `${firstField}: ${errorData[firstField][0]}`;
      }
    }
    
    // Network or other errors
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  },

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Get stored auth token
   * @returns {Promise<string|null>}
   */
  async getAuthToken() {
    try {
      return await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
};

// Export both the AuthAPI and utilities
export default AuthAPI;
export { apiUtils, api };