// import { api } from './api';

// export const symptomCheckerService = {
//   // Disease Management
//   diseases: {
//     list: async (params = {}) => {
//       try {
//         const response = await api.get('/diseases/', { params });
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to fetch diseases');
//       }
//     },

//     get: async (id) => {
//       try {
//         const response = await api.get(`/diseases/${id}/`);
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to fetch disease');
//       }
//     },

//     create: async (data) => {
//       try {
//         const response = await api.post('/diseases/', data);
//         return response.data;
//       } catch (error) {
//         throw new Error(
//           error.response?.data?.detail || 
//           Object.values(error.response?.data || {}).flat().join(', ') ||
//           'Failed to create disease'
//         );
//       }
//     },

//     update: async (id, data) => {
//       try {
//         const response = await api.patch(`/diseases/${id}/`, data);
//         return response.data;
//       } catch (error) {
//         throw new Error(
//           error.response?.data?.detail || 
//           Object.values(error.response?.data || {}).flat().join(', ') ||
//           'Failed to update disease'
//         );
//       }
//     },

//     delete: async (id) => {
//       try {
//         await api.delete(`/diseases/${id}/`);
//         return { success: true, message: 'Disease deleted successfully' };
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to delete disease');
//       }
//     },

//     // Predefined disease creation
//     createMalaria: async () => {
//       try {
//         const response = await api.post('/diseases/create_malaria/');
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to create malaria disease');
//       }
//     },

//     createPneumonia: async () => {
//       try {
//         const response = await api.post('/diseases/create_pneumonia/');
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to create pneumonia disease');
//       }
//     },
//   },

//   // Symptom Checker Sessions
//   sessions: {
//     create: async (data) => {
//       try {
//         const response = await api.post('/symptom-checker/sessions/', data);
//         return response.data;
//       } catch (error) {
//         throw new Error(
//           error.response?.data?.detail || 
//           Object.values(error.response?.data || {}).flat().join(', ') ||
//           'Failed to create symptom session'
//         );
//       }
//     },

//     get: async (sessionId) => {
//       try {
//         const response = await api.get(`/symptom-checker/sessions/${sessionId}/`);
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to fetch session');
//       }
//     },

//     list: async (params = {}) => {
//       try {
//         const response = await api.get('/symptom-checker/sessions/', { params });
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to fetch sessions');
//       }
//     },

//     analyze: async (sessionId) => {
//       try {
//         const response = await api.post(`/symptom-checker/sessions/${sessionId}/analyze/`);
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to analyze symptoms');
//       }
//     },

//     addSymptom: async (sessionId, symptom) => {
//       try {
//         const response = await api.post(`/symptom-checker/sessions/${sessionId}/add-symptom/`, { symptom });
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to add symptom');
//       }
//     },

//     requestEmergency: async (sessionId, locationData) => {
//       try {
//         const response = await api.post(
//           `/symptom-checker/sessions/${sessionId}/request-emergency/`,
//           locationData
//         );
//         return response.data;
//       } catch (error) {
//         throw new Error(error.response?.data?.detail || 'Failed to request emergency');
//       }
//     },
//   },

//   // Quick Symptom Check (without creating a session)
//   quickCheck: async (symptoms) => {
//     try {
//       const response = await api.post('/symptom-checker/quick-check/', { symptoms });
//       return response.data;
//     } catch (error) {
//       throw new Error(error.response?.data?.detail || 'Failed to perform quick check');
//     }
//   },

//   // Symptom Library
//   symptomLibrary: async () => {
//     try {
//       const response = await api.get('/symptom-checker/symptom-library/');
//       return response.data;
//     } catch (error) {
//       throw new Error(error.response?.data?.detail || 'Failed to fetch symptom library');
//     }
//   },

//   // Disease Comparison
//   compareDiseases: async (diseaseIds) => {
//     try {
//       const response = await api.get('/symptom-checker/disease-comparison/', {
//         params: { disease_ids: diseaseIds.join(',') }
//       });
//       return response.data;
//     } catch (error) {
//       throw new Error(error.response?.data?.detail || 'Failed to compare diseases');
//     }
//   },

//   // Statistics
//   getStats: async () => {
//     try {
//       const response = await api.get('/symptom-checker/statistics/');
//       return response.data;
//     } catch (error) {
//       throw new Error(error.response?.data?.detail || 'Failed to fetch statistics');
//     }
//   },
// };

// // Export as default
// export default symptomCheckerService;