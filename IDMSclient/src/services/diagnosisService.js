import api from './api';

const diagnosisService = {
  diseases: {
    list: (params = {}) => api.get('/diseases/', { params }),
    get: (id) => api.get(`/diseases/${id}/`),
    initialize: () => api.post('/diseases/initialize/'),
  },

  sessions: {
    list: (params = {}) => api.get('/symptom-sessions/', { params }),
    
    create: (data) => {
      const sessionData = {
        selected_symptoms: Array.isArray(data.selected_symptoms) ? data.selected_symptoms : [],
        custom_symptoms: Array.isArray(data.custom_symptoms) ? data.custom_symptoms : [],
        age_range: data.age_range || '',
        gender: data.gender || '',
        location: data.location || '',
        temperature: data.temperature ? parseFloat(data.temperature) : null,
        heart_rate: data.heart_rate ? parseInt(data.heart_rate) : null
      };

      if (sessionData.selected_symptoms.length === 0 && sessionData.custom_symptoms.length === 0) {
        return Promise.reject(new Error('At least one symptom must be provided'));
      }

      // Remove null/empty values
      Object.keys(sessionData).forEach(key => {
        if (sessionData[key] === null || sessionData[key] === '') {
          delete sessionData[key];
        }
      });
      
      return api.post('/symptom-sessions/', sessionData);
    },

    get: (id) => api.get(`/symptom-sessions/${id}/`),
    
    // Add the missing createDiagnosis method
    createDiagnosis: (sessionId) => {
      return api.post(`/symptom-sessions/${sessionId}/create-diagnosis/`);
    },
    
    createWithAnalysis: async (sessionData) => {
      try {
        const validation = diagnosisService.utils.validateSessionData(sessionData);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        try {
          await diagnosisService.diseases.initialize();
        } catch (initError) {
          console.warn('Disease initialization warning:', initError.message);
        }

        const response = await diagnosisService.sessions.create(sessionData);
        return response;
        
      } catch (error) {
        let errorMessage = 'Failed to create symptom session';
        
        if (error.response?.status === 400) {
          errorMessage = error.response.data?.error || 'Invalid data provided';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error occurred. Please try again.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }
    },
  },

  analyses: {
    getBySession: (sessionId) => api.get('/disease-analyses/', { params: { session_id: sessionId } }),
    get: (id) => api.get(`/disease-analyses/${id}/`),
  },

  diagnoses: {
    list: (params = {}) => api.get('/patient-diagnoses/', { params }),
    get: (id) => api.get(`/patient-diagnoses/${id}/`),
    create: (data) => api.post('/patient-diagnoses/', data),
  },

  utils: {
    validateSessionData: (data) => {
      const errors = [];
      
      const hasSelectedSymptoms = Array.isArray(data.selected_symptoms) && data.selected_symptoms.length > 0;
      const hasCustomSymptoms = Array.isArray(data.custom_symptoms) && data.custom_symptoms.length > 0;
      
      if (!hasSelectedSymptoms && !hasCustomSymptoms) {
        errors.push('At least one symptom must be provided');
      }
      
      if (data.age_range && !['0-12', '13-17', '18-25', '26-35', '36-50', '51-65', '65+'].includes(data.age_range)) {
        errors.push('Invalid age range provided');
      }
      
      if (data.gender && !['M', 'F', 'O', 'U'].includes(data.gender)) {
        errors.push('Invalid gender provided');
      }
      
      if (data.temperature !== null && data.temperature !== undefined && data.temperature !== '') {
        const temp = parseFloat(data.temperature);
        if (isNaN(temp) || temp < 90 || temp > 110) {
          errors.push('Temperature must be between 90°F and 110°F');
        }
      }
      
      if (data.heart_rate !== null && data.heart_rate !== undefined && data.heart_rate !== '') {
        const hr = parseInt(data.heart_rate);
        if (isNaN(hr) || hr < 30 || hr > 220) {
          errors.push('Heart rate must be between 30 and 220 BPM');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    formatError: (error) => {
      if (error.response?.data?.error) return error.response.data.error;
      if (error.response?.data?.detail) return error.response.data.detail;
      if (error.response?.data?.message) return error.response.data.message;
      if (error.message) return error.message;
      
      const status = error.response?.status;
      if (status === 400) return 'Invalid data provided. Please check your inputs.';
      if (status === 401) return 'Authentication required. Please log in again.';
      if (status === 500) return 'Server error occurred. Please try again later.';
      
      return 'An unexpected error occurred. Please try again.';
    },
  },
};

export default diagnosisService;