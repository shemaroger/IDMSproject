// src/services/preventionTipService.js
import api from './api';

const preventionTipService = {
  getAll: async (params) => {
    try {
      const response = await api.healthcareAPI.preventionTips.list(params);
      return response;
    } catch (error) {
      console.error('Error fetching prevention tips:', error);
      throw error;
    }
  },

  get: async (id) => {
    try {
      const response = await api.healthcareAPI.preventionTips.get(id);
      return response;
    } catch (error) {
      console.error('Error fetching prevention tip:', error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      const response = await api.healthcareAPI.preventionTips.create(data);
      return response;
    } catch (error) {
      console.error('Error creating prevention tip:', error);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.healthcareAPI.preventionTips.update(id, data);
      return response;
    } catch (error) {
      console.error('Error updating prevention tip:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.healthcareAPI.preventionTips.delete(id);
      return response;
    } catch (error) {
      console.error('Error deleting prevention tip:', error);
      throw error;
    }
  },

  getByDisease: async (diseaseName) => {
    try {
      const response = await api.healthcareAPI.preventionTips.getByDisease(diseaseName);
      return response;
    } catch (error) {
      console.error('Error fetching prevention tips by disease:', error);
      throw error;
    }
  },
};

export default preventionTipService;
