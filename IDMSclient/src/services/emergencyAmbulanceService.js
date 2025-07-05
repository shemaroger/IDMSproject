// src/services/emergencyAmbulanceService.js
import api from './api.js';
import { apiUtils, authAPI } from './api.js';

/**
 * Emergency Ambulance Service API
 * Provides comprehensive functionality for managing emergency ambulance requests
 */
export const emergencyAmbulanceService = {
  // =============================================
  // CORE CRUD OPERATIONS
  // =============================================

  /**
   * Get all emergency ambulance requests with filtering
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise} API response with emergency requests
   */
  list: async (params = {}) => {
    try {
      const response = await api.get('/emergency-ambulance-requests/', { params });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get a specific emergency request by ID
   * @param {number|string} id - Emergency request ID
   * @returns {Promise} API response with emergency request details
   */
  get: async (id) => {
    try {
      const response = await api.get(`/emergency-ambulance-requests/${id}/`);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Create a new emergency ambulance request
   * @param {Object} requestData - Emergency request data
   * @returns {Promise} API response with created request
   */
  create: async (requestData) => {
    try {
      // Validate required fields
      const requiredFields = ['location', 'condition_description'];
      const missingFields = requiredFields.filter(field => !requestData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Clean and format the data according to backend expectations
      const cleanData = {
        location: requestData.location.trim(),
        condition_description: requestData.condition_description.trim(),
        suspected_disease: requestData.suspected_disease?.trim() || '',
        urgency_level: requestData.urgency_level || 'standard',
        additional_notes: requestData.additional_notes?.trim() || '',
        // Only include clinic if it's not empty
        ...(requestData.clinic && { clinic: parseInt(requestData.clinic) }),
        // Only include GPS coordinates if they exist
        ...(requestData.gps_coordinates && { gps_coordinates: requestData.gps_coordinates.trim() })
      };

      console.log('Sending emergency request data:', cleanData);
      const response = await api.post('/emergency-ambulance-requests/', cleanData);
      return response;
    } catch (error) {
      console.error('Create emergency request error:', error.response?.data);
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Update an emergency request
   * @param {number|string} id - Emergency request ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} API response with updated request
   */
  update: async (id, updateData) => {
    try {
      const response = await api.patch(`/emergency-ambulance-requests/${id}/`, updateData);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Delete an emergency request
   * @param {number|string} id - Emergency request ID
   * @returns {Promise} API response
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/emergency-ambulance-requests/${id}/`);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // =============================================
  // WORKFLOW MANAGEMENT ACTIONS
  // =============================================

  /**
   * Approve an emergency request
   * @param {number|string} id - Emergency request ID
   * @param {Object} approvalData - Approval details
   * @returns {Promise} API response with approved request
   */
  approve: async (id, approvalData = {}) => {
    try {
      const response = await api.post(`/emergency-ambulance-requests/${id}/approve/`, {
        comments: approvalData.comments || '',
        priority: approvalData.priority || '',
        urgency_level: approvalData.urgency_level || ''
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Reject an emergency request
   * @param {number|string} id - Emergency request ID
   * @param {Object} rejectionData - Rejection details
   * @returns {Promise} API response with rejected request
   */
  reject: async (id, rejectionData = {}) => {
    try {
      const response = await api.post(`/emergency-ambulance-requests/${id}/reject/`, {
        comments: rejectionData.comments || '',
        reason: rejectionData.reason || 'No reason provided'
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Dispatch ambulance to emergency request
   * @param {number|string} id - Emergency request ID
   * @param {Object} dispatchData - Dispatch details
   * @returns {Promise} API response with dispatched request
   */
  dispatch: async (id, dispatchData = {}) => {
    try {
      const response = await api.post(`/emergency-ambulance-requests/${id}/dispatch/`, {
        ambulance_id: dispatchData.ambulance_id || '',
        hospital_destination: dispatchData.hospital_destination || ''
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Update emergency request status
   * @param {number|string} id - Emergency request ID
   * @param {string} status - New status (P, D, A, T, C)
   * @param {Object} additionalData - Additional status data
   * @returns {Promise} API response with updated request
   */
  updateStatus: async (id, status, additionalData = {}) => {
    try {
      // Validate status
      const validStatuses = ['P', 'D', 'A', 'T', 'C'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`);
      }

      const response = await api.post(`/emergency-ambulance-requests/${id}/update_status/`, {
        status,
        ...additionalData
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // =============================================
  // BULK OPERATIONS
  // =============================================

  /**
   * Bulk approve multiple emergency requests
   * @param {Array} requestIds - Array of request IDs
   * @param {Object} approvalData - Common approval data
   * @returns {Promise} Bulk operation results
   */
  bulkApprove: async (requestIds, approvalData = {}) => {
    try {
      console.log('Bulk approving emergency requests:', requestIds);
      
      const promises = requestIds.map(async (id) => {
        try {
          return await emergencyAmbulanceService.approve(id, approvalData);
        } catch (error) {
          console.error(`Failed to approve emergency request ${id}:`, error);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const failed = results.filter(result => result.status === 'rejected');
      const succeeded = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} emergency requests failed to approve`);
        throw new Error(`Failed to approve ${failed.length} out of ${requestIds.length} emergency requests`);
      }
      
      return { 
        success: true, 
        message: `${succeeded.length} emergency requests approved successfully`,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      console.error('Bulk approve error:', error);
      throw new Error(`Bulk approve failed: ${error.message}`);
    }
  },

  /**
   * Bulk reject multiple emergency requests
   * @param {Array} requestIds - Array of request IDs
   * @param {Object} rejectionData - Common rejection data
   * @returns {Promise} Bulk operation results
   */
  bulkReject: async (requestIds, rejectionData = {}) => {
    try {
      console.log('Bulk rejecting emergency requests:', requestIds);
      
      const promises = requestIds.map(async (id) => {
        try {
          return await emergencyAmbulanceService.reject(id, rejectionData);
        } catch (error) {
          console.error(`Failed to reject emergency request ${id}:`, error);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const failed = results.filter(result => result.status === 'rejected');
      const succeeded = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} emergency requests failed to reject`);
        throw new Error(`Failed to reject ${failed.length} out of ${requestIds.length} emergency requests`);
      }
      
      return { 
        success: true, 
        message: `${succeeded.length} emergency requests rejected successfully`,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      console.error('Bulk reject error:', error);
      throw new Error(`Bulk reject failed: ${error.message}`);
    }
  },

  /**
   * Bulk dispatch multiple emergency requests
   * @param {Array} requestIds - Array of request IDs
   * @param {Object} dispatchData - Common dispatch data
   * @returns {Promise} Bulk operation results
   */
  bulkDispatch: async (requestIds, dispatchData = {}) => {
    try {
      console.log('Bulk dispatching emergency requests:', requestIds);
      
      const promises = requestIds.map(async (id) => {
        try {
          return await emergencyAmbulanceService.dispatch(id, dispatchData);
        } catch (error) {
          console.error(`Failed to dispatch emergency request ${id}:`, error);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const failed = results.filter(result => result.status === 'rejected');
      const succeeded = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} emergency requests failed to dispatch`);
        throw new Error(`Failed to dispatch ${failed.length} out of ${requestIds.length} emergency requests`);
      }
      
      return { 
        success: true, 
        message: `${succeeded.length} emergency requests dispatched successfully`,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      console.error('Bulk dispatch error:', error);
      throw new Error(`Bulk dispatch failed: ${error.message}`);
    }
  },

  /**
   * Bulk update status for multiple emergency requests
   * @param {Array} requestIds - Array of request IDs
   * @param {string} status - New status
   * @param {Object} additionalData - Additional status data
   * @returns {Promise} Bulk operation results
   */
  bulkUpdateStatus: async (requestIds, status, additionalData = {}) => {
    try {
      console.log(`Bulk updating emergency requests to ${status}:`, requestIds);
      
      const promises = requestIds.map(async (id) => {
        try {
          return await emergencyAmbulanceService.updateStatus(id, status, additionalData);
        } catch (error) {
          console.error(`Failed to update emergency request ${id} to ${status}:`, error);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const failed = results.filter(result => result.status === 'rejected');
      const succeeded = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} emergency requests failed to update`);
        throw new Error(`Failed to update ${failed.length} out of ${requestIds.length} emergency requests`);
      }
      
      return { 
        success: true, 
        message: `${succeeded.length} emergency requests updated successfully`,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      console.error('Bulk update error:', error);
      throw new Error(`Bulk update failed: ${error.message}`);
    }
  },

  /**
   * Bulk delete multiple emergency requests
   * @param {Array} requestIds - Array of request IDs
   * @returns {Promise} Bulk operation results
   */
  bulkDelete: async (requestIds) => {
    try {
      console.log('Bulk deleting emergency requests:', requestIds);
      
      const promises = requestIds.map(async (id) => {
        try {
          return await emergencyAmbulanceService.delete(id);
        } catch (error) {
          console.error(`Failed to delete emergency request ${id}:`, error);
          throw error;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      const failed = results.filter(result => result.status === 'rejected');
      const succeeded = results.filter(result => result.status === 'fulfilled');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} emergency requests failed to delete`);
        throw new Error(`Failed to delete ${failed.length} out of ${requestIds.length} emergency requests`);
      }
      
      return { 
        success: true, 
        message: `${succeeded.length} emergency requests deleted successfully`,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      console.error('Bulk delete error:', error);
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  },

  // =============================================
  // FILTERING AND SEARCH
  // =============================================

  /**
   * Get emergency requests by status
   * @param {string} status - Request status
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByStatus: async (status, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        status,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by approval status
   * @param {string} approvalStatus - Approval status (pending, approved, rejected)
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByApprovalStatus: async (approvalStatus, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        approval_status: approvalStatus,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by priority
   * @param {string} priority - Priority level (critical, urgent, normal)
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByPriority: async (priority, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        priority_override: priority,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by clinic
   * @param {number|string} clinicId - Clinic ID
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByClinic: async (clinicId, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        clinic: clinicId,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by patient
   * @param {number|string} patientId - Patient ID
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByPatient: async (patientId, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        patient: patientId,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by suspected disease
   * @param {string} disease - Disease name
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getBySuspectedDisease: async (disease, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        suspected_disease__icontains: disease,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get emergency requests by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} additionalParams - Additional query parameters
   * @returns {Promise} API response with filtered requests
   */
  getByDateRange: async (startDate, endDate, additionalParams = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        request_time__gte: startDate,
        request_time__lte: endDate,
        ...additionalParams
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Search emergency requests
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise} API response with search results
   */
  search: async (query, filters = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        search: query,
        ...filters
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // =============================================
  // ANALYTICS AND STATISTICS
  // =============================================

  /**
   * Get emergency request statistics
   * @param {Object} filters - Optional filters for statistics
   * @returns {Promise} API response with statistics
   */
  getStatistics: async (filters = {}) => {
    try {
      // Try the dedicated statistics endpoint first
      const response = await api.get('/emergency-requests/statistics/', {
        params: filters
      });
      return response;
    } catch (error) {
      // If statistics endpoint doesn't exist, calculate from list data
      if (error.response?.status === 404) {
        console.log('Statistics endpoint not found, calculating from list data...');
        try {
          const listResponse = await emergencyAmbulanceService.list(filters);
          const requests = listResponse.data.results || listResponse.data;
          
          // Calculate statistics from the data
          const stats = {
            total: requests.length,
            pending: requests.filter(r => r.approval_status === 'pending').length,
            approved: requests.filter(r => r.approval_status === 'approved').length,
            rejected: requests.filter(r => r.approval_status === 'rejected').length,
            by_status: {
              P: requests.filter(r => r.status === 'P').length,
              D: requests.filter(r => r.status === 'D').length,
              A: requests.filter(r => r.status === 'A').length,
              T: requests.filter(r => r.status === 'T').length,
              C: requests.filter(r => r.status === 'C').length,
            },
            critical_pending: requests.filter(r => 
              r.approval_status === 'pending' && 
              (r.priority_override === 'critical' || r.urgency_level === 'immediate')
            ).length,
            by_clinic: requests.reduce((acc, req) => {
              if (req.clinic_name) {
                const existing = acc.find(item => item.clinic__name === req.clinic_name);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ clinic__name: req.clinic_name, count: 1 });
                }
              }
              return acc;
            }, []).sort((a, b) => b.count - a.count)
          };
          
          return { data: stats };
        } catch (listError) {
          console.error('Error calculating statistics from list:', listError);
          // Return empty statistics if both fail
          return {
            data: {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              by_status: { P: 0, D: 0, A: 0, T: 0, C: 0 },
              critical_pending: 0,
              by_clinic: []
            }
          };
        }
      } else {
        throw new Error(apiUtils.formatErrorMessage(error));
      }
    }
  },

  /**
   * Get pending critical cases
   * @returns {Promise} API response with critical pending cases
   */
  getCriticalPendingCases: async () => {
    try {
      const response = await emergencyAmbulanceService.list({
        approval_status: 'pending',
        priority_override: 'critical'
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get urgent cases requiring immediate attention
   * @returns {Promise} API response with urgent cases
   */
  getUrgentCases: async () => {
    try {
      const response = await emergencyAmbulanceService.list({
        urgency_level__in: ['immediate', 'urgent'],
        status__in: ['P', 'D']
      });
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  /**
   * Get response time analytics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise} Response time analytics data
   */
  getResponseTimeAnalytics: async (filters = {}) => {
    try {
      const response = await emergencyAmbulanceService.list({
        ...filters,
        include_response_times: true
      });
      
      // Calculate response times on frontend if backend doesn't provide them
      const requests = response.data.results || response.data;
      const analytics = emergencyAmbulanceService.calculateResponseTimes(requests);
      
      return {
        ...response,
        data: {
          ...response.data,
          analytics
        }
      };
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Calculate response times for emergency requests
   * @param {Array} requests - Array of emergency request objects
   * @returns {Object} Response time analytics
   */
  calculateResponseTimes: (requests) => {
    const analytics = {
      total_requests: requests.length,
      with_approval_time: 0,
      with_dispatch_time: 0,
      with_completion_time: 0,
      average_approval_time: 0,
      average_dispatch_time: 0,
      average_completion_time: 0,
      fastest_response: null,
      slowest_response: null
    };

    const approvalTimes = [];
    const dispatchTimes = [];
    const completionTimes = [];

    requests.forEach(request => {
      const requestTime = new Date(request.request_time);
      
      // Calculate approval time
      if (request.approved_at) {
        const approvalTime = new Date(request.approved_at) - requestTime;
        approvalTimes.push(approvalTime);
        analytics.with_approval_time++;
      }
      
      // Calculate dispatch time
      if (request.dispatched_at) {
        const dispatchTime = new Date(request.dispatched_at) - requestTime;
        dispatchTimes.push(dispatchTime);
        analytics.with_dispatch_time++;
      }
      
      // Calculate completion time
      if (request.completed_at) {
        const completionTime = new Date(request.completed_at) - requestTime;
        completionTimes.push(completionTime);
        analytics.with_completion_time++;
      }
    });

    // Calculate averages
    if (approvalTimes.length > 0) {
      analytics.average_approval_time = approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length;
    }
    
    if (dispatchTimes.length > 0) {
      analytics.average_dispatch_time = dispatchTimes.reduce((a, b) => a + b, 0) / dispatchTimes.length;
    }
    
    if (completionTimes.length > 0) {
      analytics.average_completion_time = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      analytics.fastest_response = Math.min(...completionTimes);
      analytics.slowest_response = Math.max(...completionTimes);
    }

    return analytics;
  },

  /**
   * Format emergency request for display
   * @param {Object} request - Emergency request object
   * @returns {Object} Formatted request data
   */
  formatRequestForDisplay: (request) => {
    return {
      ...request,
      formatted_request_time: new Date(request.request_time).toLocaleString(),
      formatted_approved_at: request.approved_at ? new Date(request.approved_at).toLocaleString() : null,
      formatted_dispatched_at: request.dispatched_at ? new Date(request.dispatched_at).toLocaleString() : null,
      formatted_completed_at: request.completed_at ? new Date(request.completed_at).toLocaleString() : null,
      status_display: emergencyAmbulanceService.getStatusDisplay(request.status),
      approval_status_display: emergencyAmbulanceService.getApprovalStatusDisplay(request.approval_status),
      priority_display: request.priority_override || 'Normal',
      urgency_display: request.urgency_level || 'Standard'
    };
  },

  /**
   * Get human-readable status display
   * @param {string} status - Status code
   * @returns {string} Human-readable status
   */
  getStatusDisplay: (status) => {
    const statusMap = {
      'P': 'Pending',
      'D': 'Dispatched',
      'A': 'Arrived',
      'T': 'In Transit',
      'C': 'Completed'
    };
    return statusMap[status] || status;
  },

  /**
   * Get human-readable approval status display
   * @param {string} approvalStatus - Approval status
   * @returns {string} Human-readable approval status
   */
  getApprovalStatusDisplay: (approvalStatus) => {
    const statusMap = {
      'pending': 'Pending Approval',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusMap[approvalStatus] || approvalStatus;
  },

  /**
   * Get priority color for UI
   * @param {string} priority - Priority level
   * @returns {string} CSS color class or hex color
   */
  getPriorityColor: (priority) => {
    const colorMap = {
      'critical': '#dc2626', // red-600
      'urgent': '#ea580c',   // orange-600
      'normal': '#16a34a'    // green-600
    };
    return colorMap[priority] || '#6b7280'; // gray-500
  },

  /**
   * Get status color for UI
   * @param {string} status - Status code
   * @returns {string} CSS color class or hex color
   */
  getStatusColor: (status) => {
    const colorMap = {
      'P': '#f59e0b', // yellow-500
      'D': '#3b82f6', // blue-500
      'A': '#8b5cf6', // violet-500
      'T': '#06b6d4', // cyan-500
      'C': '#10b981'  // emerald-500
    };
    return colorMap[status] || '#6b7280'; // gray-500
  },

  /**
   * Validate emergency request data
   * @param {Object} requestData - Request data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateRequestData: (requestData) => {
    const errors = [];
    
    // Required fields validation
    if (!requestData.location || requestData.location.trim() === '') {
      errors.push('Location is required');
    }
    
    if (!requestData.condition_description || requestData.condition_description.trim() === '') {
      errors.push('Condition description is required');
    }
    
    // GPS coordinates validation (if provided)
    if (requestData.gps_coordinates) {
      const gpsPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
      if (!gpsPattern.test(requestData.gps_coordinates)) {
        errors.push('GPS coordinates must be in "latitude,longitude" format');
      }
    }
    
    // Priority validation (if provided)
    if (requestData.priority_override) {
      const validPriorities = ['critical', 'urgent', 'normal'];
      if (!validPriorities.includes(requestData.priority_override)) {
        errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }
    
    // Urgency validation (if provided)
    if (requestData.urgency_level) {
      const validUrgencyLevels = ['immediate', 'urgent', 'standard', 'non_urgent'];
      if (!validUrgencyLevels.includes(requestData.urgency_level)) {
        errors.push(`Urgency level must be one of: ${validUrgencyLevels.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Create emergency request from symptom session
   * @param {number|string} sessionId - Symptom session ID
   * @param {Object} additionalData - Additional emergency request data
   * @returns {Promise} API response with created emergency request
   */
  createFromSymptomSession: async (sessionId, additionalData = {}) => {
    try {
      // Get symptom session data
      const sessionResponse = await api.get(`/symptom-sessions/${sessionId}/`);
      const session = sessionResponse.data;
      
      // Prepare emergency request data
      const requestData = {
        condition_description: session.symptoms ? session.symptoms.join(', ') : 'Symptoms reported via symptom checker',
        suspected_disease: session.primary_disease_name || '',
        priority_override: session.severity_level === 'critical' ? 'critical' : 
                          session.severity_level === 'severe' ? 'urgent' : 'normal',
        urgency_level: session.severity_level === 'critical' ? 'immediate' : 
                      session.severity_level === 'severe' ? 'urgent' : 'standard',
        additional_notes: `Created from symptom session #${sessionId}. Risk score: ${session.overall_risk_score || 'N/A'}`,
        ...additionalData
      };
      
      const response = await emergencyAmbulanceService.create(requestData);
      return response;
    } catch (error) {
      throw new Error(apiUtils.formatErrorMessage(error));
    }
  },

  // =============================================
  // EXPORT AND REPORTING
  // =============================================

  /**
   * Export emergency requests data
   * @param {string} format - Export format (csv, xlsx, pdf)
   * @param {Object} filters - Filters to apply
   * @returns {Promise} API response with export file
   */
  export: async (format = 'csv', filters = {}) => {
    try {
      const response = await api.get(`/emergency-ambulance-requests/export/`, {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  },

  /**
   * Generate emergency report
   * @param {Object} reportParams - Report parameters
   * @returns {Promise} API response with report data
   */
  generateReport: async (reportParams = {}) => {
    try {
      const response = await api.post('/emergency-ambulance-requests/generate-report/', reportParams);
      return response;
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }
};

export default emergencyAmbulanceService;