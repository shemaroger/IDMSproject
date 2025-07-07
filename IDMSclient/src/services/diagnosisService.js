// src/services/diagnosisService.js - Enhanced with Medical Tests and Treatment Plans
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

    get: (id) => {
      if (!id || id === 'undefined') {
        return Promise.reject(new Error('Session ID is required'));
      }
      return api.get(`/symptom-sessions/${id}/`);
    },
    
    createDiagnosis: (sessionId) => {
      if (!sessionId || sessionId === 'undefined') {
        return Promise.reject(new Error('Session ID is required'));
      }
      return api.post(`/symptom-sessions/${sessionId}/create-diagnosis/`);
    },
    
    addCustomSymptom: (sessionId, symptom) => {
      if (!sessionId || sessionId === 'undefined') {
        return Promise.reject(new Error('Session ID is required'));
      }
      return api.post(`/symptom-sessions/${sessionId}/add_custom_symptom/`, { symptom });
    },
    
    reanalyze: (sessionId) => {
      if (!sessionId || sessionId === 'undefined') {
        return Promise.reject(new Error('Session ID is required'));
      }
      return api.post(`/symptom-sessions/${sessionId}/reanalyze/`);
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
    getBySession: (sessionId) => {
      if (!sessionId || sessionId === 'undefined') {
        return Promise.reject(new Error('Session ID is required'));
      }
      return api.get('/disease-analyses/', { params: { session_id: sessionId } });
    },
    get: (id) => api.get(`/disease-analyses/${id}/`),
  },

  diagnoses: {
    list: (params = {}) => api.get('/patient-diagnoses/', { params }),
    get: (id) => api.get(`/patient-diagnoses/${id}/`),
    create: (data) => api.post('/patient-diagnoses/', data),
    
    confirm: async (id, data) => {
      try {
        if (!id) {
          throw new Error('Diagnosis ID is required');
        }
        const response = await api.post(`/patient-diagnoses/${id}/confirm/`, data);
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to confirm diagnosis';
        throw new Error(errorMessage);
      }
    },
    
    reject: async (id, data) => {
      try {
        if (!id) {
          throw new Error('Diagnosis ID is required');
        }
        const response = await api.post(`/patient-diagnoses/${id}/reject/`, data);
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to reject diagnosis';
        throw new Error(errorMessage);
      }
    },
    
    assignDoctor: async (id, doctorId) => {
      try {
        if (!id || !doctorId) {
          throw new Error('Diagnosis ID and Doctor ID are required');
        }
        const response = await api.post(`/patient-diagnoses/${id}/assign_doctor/`, { 
          doctor_id: doctorId 
        });
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to assign doctor';
        throw new Error(errorMessage);
      }
    },
    
    getTreatmentPlan: async (id) => {
      try {
        if (!id) {
          throw new Error('Diagnosis ID is required');
        }
        const response = await api.get(`/patient-diagnoses/${id}/treatment_plan/`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null; // No treatment plan exists
        }
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to get treatment plan';
        throw new Error(errorMessage);
      }
    },
    
    createFromSession: async (sessionId) => {
      try {
        if (!sessionId || sessionId === 'undefined') {
          throw new Error('Session ID is required');
        }
        
        const response = await diagnosisService.sessions.createDiagnosis(sessionId);
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to create diagnosis from session';
        throw new Error(errorMessage);
      }
    }
  },

  // NEW: Medical Tests API
  medicalTests: {
    list: async (params = {}) => {
      try {
        const response = await api.get('/medical-tests/', { params });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    get: async (id) => {
      try {
        const response = await api.get(`/medical-tests/${id}/`);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    create: async (data) => {
      try {
        const response = await api.post('/medical-tests/', data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    update: async (id, data) => {
      try {
        const response = await api.patch(`/medical-tests/${id}/`, data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    delete: async (id) => {
      try {
        await api.delete(`/medical-tests/${id}/`);
        return { success: true };
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    getByType: async (testType) => {
      try {
        const response = await api.get('/medical-tests/', { 
          params: { test_type: testType } 
        });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    getByDisease: async (diseaseId) => {
      try {
        const response = await api.get('/medical-tests/', { 
          params: { disease_specific: diseaseId } 
        });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    }
  },

  // NEW: Patient Test Results API
  testResults: {
    list: async (params = {}) => {
      try {
        const response = await api.get('/patient-test-results/', { params });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    get: async (id) => {
      try {
        const response = await api.get(`/patient-test-results/${id}/`);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    create: async (data) => {
      try {
        const response = await api.post('/patient-test-results/', data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    update: async (id, data) => {
      try {
        const response = await api.patch(`/patient-test-results/${id}/`, data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    delete: async (id) => {
      try {
        await api.delete(`/patient-test-results/${id}/`);
        return { success: true };
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    getByDiagnosis: async (diagnosisId) => {
      try {
        const response = await api.get('/patient-test-results/', { 
          params: { diagnosis_id: diagnosisId } 
        });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    }
  },

  // NEW: Treatment Plans API
  treatmentPlans: {
    list: async (params = {}) => {
      try {
        const response = await api.get('/treatment-plans/', { params });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    get: async (id) => {
      try {
        const response = await api.get(`/treatment-plans/${id}/`);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    create: async (data) => {
      try {
        const response = await api.post('/treatment-plans/', data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    update: async (id, data) => {
      try {
        const response = await api.patch(`/treatment-plans/${id}/`, data);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },
    
    delete: async (id) => {
      try {
        await api.delete(`/treatment-plans/${id}/`);
        return { success: true };
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    getByDiagnosis: async (diagnosisId) => {
      try {
        const response = await api.get('/treatment-plans/', { 
          params: { diagnosis_id: diagnosisId } 
        });
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    addMedication: async (id, medicationData) => {
      try {
        const response = await api.post(`/treatment-plans/${id}/add_medication/`, medicationData);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    },

    complete: async (id) => {
      try {
        const response = await api.post(`/treatment-plans/${id}/complete/`);
        return response.data;
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    }
  },

  // NEW: Doctors API
  doctors: {
    list: async (params = {}) => {
      try {
        // Try the main doctors endpoint first
        const response = await api.get('/doctors/', { params });
        return response.data;
      } catch (error) {
        // If doctors endpoint fails, try to get users with Doctor role
        try {
          console.warn('Doctors endpoint failed, trying users endpoint with role filter');
          const usersResponse = await api.get('/users/', { 
            params: { ...params, role: 'Doctor' } 
          });
          return usersResponse.data;
        } catch (fallbackError) {
          // If both fail, return empty array with warning
          console.warn('Both doctors and users endpoints failed, returning empty array');
          return { results: [], count: 0 };
        }
      }
    },
    
    get: async (id) => {
      try {
        const response = await api.get(`/doctors/${id}/`);
        return response.data;
      } catch (error) {
        // Fallback to users endpoint
        try {
          const userResponse = await api.get(`/users/${id}/`);
          return userResponse.data;
        } catch (fallbackError) {
          throw new Error(diagnosisService.utils.formatError(error));
        }
      }
    },

    getCases: async (doctorId = null) => {
      try {
        const endpoint = doctorId ? `/doctors/${doctorId}/cases/` : '/doctor-cases/';
        const response = await api.get(endpoint);
        return response.data;
      } catch (error) {
        // Fallback: try to get diagnoses filtered by doctor
        try {
          console.warn('Doctor cases endpoint failed, trying diagnoses with doctor filter');
          const diagnosesResponse = await api.get('/patient-diagnoses/', {
            params: doctorId ? { treating_doctor: doctorId } : {}
          });
          return diagnosesResponse.data;
        } catch (fallbackError) {
          console.warn('Both doctor-cases and patient-diagnoses endpoints failed');
          return { results: [], count: 0 };
        }
      }
    },

    getActiveCases: async () => {
      try {
        const response = await api.get('/doctor-cases/active_cases/');
        return response.data;
      } catch (error) {
        // Fallback: filter diagnoses by status
        try {
          console.warn('Active cases endpoint failed, trying diagnoses with status filter');
          const diagnosesResponse = await api.get('/patient-diagnoses/', {
            params: { status: 'doctor_confirmed' }
          });
          return diagnosesResponse.data;
        } catch (fallbackError) {
          console.warn('Active cases fallback failed');
          return { results: [], count: 0 };
        }
      }
    },

    getPendingCases: async () => {
      try {
        const response = await api.get('/doctor-cases/pending_cases/');
        return response.data;
      } catch (error) {
        // Fallback: filter diagnoses by pending status
        try {
          console.warn('Pending cases endpoint failed, trying diagnoses with pending filter');
          const diagnosesResponse = await api.get('/patient-diagnoses/', {
            params: { status: 'self_reported' }
          });
          return diagnosesResponse.data;
        } catch (fallbackError) {
          console.warn('Pending cases fallback failed');
          return { results: [], count: 0 };
        }
      }
    }
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

    validateTestResult: (data) => {
      const errors = [];
      
      if (!data.diagnosis) {
        errors.push('Diagnosis ID is required');
      }
      
      if (!data.test) {
        errors.push('Test ID is required');
      }
      
      if (!data.result) {
        errors.push('Test result is required');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    validateTreatmentPlan: (data) => {
      const errors = [];
      
      if (!data.diagnosis) {
        errors.push('Diagnosis ID is required');
      }
      
      if (!data.duration) {
        errors.push('Treatment duration is required');
      }
      
      if (data.follow_up_required && !data.follow_up_interval) {
        errors.push('Follow-up interval is required when follow-up is enabled');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    validateMedication: (data) => {
      const errors = [];
      
      if (!data.name) {
        errors.push('Medication name is required');
      }
      
      if (!data.dosage) {
        errors.push('Dosage is required');
      }
      
      if (!data.frequency) {
        errors.push('Frequency is required');
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
      if (status === 403) return 'Access denied. You do not have permission to perform this action.';
      if (status === 404) return 'The requested resource was not found.';
      if (status === 500) return 'Server error occurred. Please try again later.';
      
      return 'An unexpected error occurred. Please try again.';
    },
    
    validateId: (id, fieldName = 'ID') => {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error(`${fieldName} is required and cannot be undefined`);
      }
      
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error(`${fieldName} must be a valid positive number`);
      }
      
      return numericId;
    },
    
    createSessionAndDiagnosis: async (sessionData, shouldCreateDiagnosis = false) => {
      try {
        // First create the session
        const sessionResponse = await diagnosisService.sessions.createWithAnalysis(sessionData);
        const session = sessionResponse.data;
        
        console.log('Session created:', session.id);
        
        // If requested, create diagnosis from session
        if (shouldCreateDiagnosis && session.id) {
          try {
            const diagnosisResponse = await diagnosisService.diagnoses.createFromSession(session.id);
            return {
              session: session,
              diagnosis: diagnosisResponse,
              success: true
            };
          } catch (diagnosisError) {
            console.warn('Session created but diagnosis creation failed:', diagnosisError.message);
            return {
              session: session,
              diagnosis: null,
              diagnosisError: diagnosisError.message,
              success: true
            };
          }
        }
        
        return {
          session: session,
          diagnosis: null,
          success: true
        };
        
      } catch (error) {
        throw new Error(diagnosisService.utils.formatError(error));
      }
    }
  },
  
  emergency: {
    detectEmergencySymptoms: (symptoms) => {
      const emergencySymptoms = [
        'difficulty_breathing', 'severe_chest_pain', 'confusion', 'seizures',
        'blue_lips_or_fingernails', 'severe_abdominal_pain', 'high_fever'
      ];
      
      const hasEmergencySymptoms = symptoms.some(symptom => 
        emergencySymptoms.some(emergency => 
          symptom.toLowerCase().includes(emergency) ||
          emergency.includes(symptom.toLowerCase())
        )
      );
      
      return {
        hasEmergencySymptoms,
        emergencySymptoms: symptoms.filter(symptom =>
          emergencySymptoms.some(emergency =>
            symptom.toLowerCase().includes(emergency) ||
            emergency.includes(symptom.toLowerCase())
          )
        )
      };
    },
    
    requestEmergencyServices: async (location) => {
      try {
        return api.post('/emergency-requests/', {
          location: location,
          request_type: 'symptom_checker_emergency',
          priority: 'critical'
        });
      } catch (error) {
        throw new Error('Failed to request emergency services: ' + error.message);
      }
    }
  }
};

export default diagnosisService;