// src/services/emergencyAmbulanceService.js - UPDATED WITH APPROVAL SUPPORT
import { healthcareAPI } from './api';

/**
 * Emergency Ambulance Service with Patient Auto-Detection and Approval System
 */
class EmergencyAmbulanceService {
  
  // =========================== EMERGENCY REQUEST MANAGEMENT ===========================
  
  /**
   * Create new emergency ambulance request with automatic patient detection
   */
  async createEmergencyRequest(requestData) {
    try {
      console.log('🚨 Creating emergency ambulance request:', requestData);
      
      // Auto-detect patient if not provided
      let processedData = { ...requestData };
      if (!processedData.patient) {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser) {
          throw new Error('User must be logged in to create emergency request');
        }
        
        // For patients, use their own patient ID
        if (currentUser.role?.name === 'Patient') {
          processedData.patient = await this.getPatientIdForUser(currentUser.id);
        } else {
          // For staff members, patient field should be provided explicitly
          throw new Error('Patient must be specified when creating emergency request as staff member');
        }
      }
      
      // Validate required fields
      const validation = this.validateEmergencyRequest(processedData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Add approval tracking fields
      processedData.approval_status = 'pending';
      processedData.created_by = this.getCurrentUser()?.id;
      processedData.created_by_name = this.getCurrentUser()?.name || this.getCurrentUser()?.email;
      
      const response = await healthcareAPI.emergencies.create(processedData);
      
      console.log('✅ Emergency request created:', response.data);
      
      return {
        success: true,
        data: response.data,
        request: response.data,
        message: 'Emergency ambulance request submitted successfully'
      };
    } catch (error) {
      console.error('❌ Error creating emergency request:', error);
      throw this.handleError(error, 'Failed to create emergency request');
    }
  }
  
  /**
   * Get patient ID for a user
   */
  async getPatientIdForUser(userId) {
    try {
      // Try to get patient record for this user
      const response = await healthcareAPI.patients.list({ user: userId });
      
      if (response.data?.results?.length > 0) {
        return response.data.results[0].id;
      } else if (response.data?.length > 0) {
        return response.data[0].id;
      } else {
        throw new Error('No patient record found for current user. Please contact support.');
      }
    } catch (error) {
      console.error('Error getting patient ID:', error);
      throw new Error('Unable to find patient record for current user');
    }
  }
  
  /**
   * Create emergency request for specific patient (staff use)
   */
  async createEmergencyRequestForPatient(patientId, requestData) {
    try {
      const processedData = {
        ...requestData,
        patient: patientId
      };
      
      return await this.createEmergencyRequest(processedData);
    } catch (error) {
      throw this.handleError(error, 'Failed to create emergency request for patient');
    }
  }
  
  // =========================== APPROVAL SYSTEM ===========================
  
  /**
   * Approve emergency request
   */
  async approveEmergencyRequest(requestId, approvalData) {
    try {
      console.log('✅ Approving emergency request:', requestId, approvalData);
      
      const currentUser = this.getCurrentUser();
      if (!this.canApproveRequests()) {
        throw new Error('You do not have permission to approve emergency requests');
      }
      
      const updateData = {
        approval_status: 'approved',
        approved_by: currentUser.id,
        approved_by_name: currentUser.name || currentUser.email,
        approved_at: new Date().toISOString(),
        approval_comments: approvalData.comments || '',
        priority_override: approvalData.priority || null,
        recommended_hospital: approvalData.recommendedHospital || null,
        urgency_level: approvalData.urgencyLevel || null,
        additional_notes: approvalData.additionalNotes || null
      };
      
      // Update the request with approval data
      const response = await healthcareAPI.emergencies.update(requestId, updateData);
      
      console.log('✅ Emergency request approved:', response.data);
      
      return {
        success: true,
        data: response.data,
        request: response.data,
        message: 'Emergency request approved successfully'
      };
    } catch (error) {
      console.error('❌ Error approving emergency request:', error);
      throw this.handleError(error, 'Failed to approve emergency request');
    }
  }
  
  /**
   * Reject emergency request
   */
  async rejectEmergencyRequest(requestId, rejectionData) {
    try {
      console.log('❌ Rejecting emergency request:', requestId, rejectionData);
      
      const currentUser = this.getCurrentUser();
      if (!this.canApproveRequests()) {
        throw new Error('You do not have permission to reject emergency requests');
      }
      
      const updateData = {
        approval_status: 'rejected',
        approved_by: currentUser.id,
        approved_by_name: currentUser.name || currentUser.email,
        approved_at: new Date().toISOString(),
        approval_comments: rejectionData.comments || '',
        rejection_reason: rejectionData.reason || null,
        additional_notes: rejectionData.additionalNotes || null
      };
      
      // Update the request with rejection data
      const response = await healthcareAPI.emergencies.update(requestId, updateData);
      
      console.log('❌ Emergency request rejected:', response.data);
      
      return {
        success: true,
        data: response.data,
        request: response.data,
        message: 'Emergency request rejected'
      };
    } catch (error) {
      console.error('❌ Error rejecting emergency request:', error);
      throw this.handleError(error, 'Failed to reject emergency request');
    }
  }
  
  /**
   * Get emergency requests by approval status
   */
  async getEmergencyRequestsByApprovalStatus(approvalStatus, params = {}) {
    try {
      const queryParams = {
        ...params,
        approval_status: approvalStatus,
        ordering: '-request_time'
      };
      
      const response = await healthcareAPI.emergencies.list(queryParams);
      
      return {
        success: true,
        data: response.data,
        requests: response.data.results || response.data,
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch ${approvalStatus} emergency requests`);
    }
  }
  
  /**
   * Get pending approval requests
   */
  async getPendingApprovalRequests(params = {}) {
    return await this.getEmergencyRequestsByApprovalStatus('pending', params);
  }
  
  /**
   * Get approved requests
   */
  async getApprovedRequests(params = {}) {
    return await this.getEmergencyRequestsByApprovalStatus('approved', params);
  }
  
  /**
   * Get rejected requests
   */
  async getRejectedRequests(params = {}) {
    return await this.getEmergencyRequestsByApprovalStatus('rejected', params);
  }
  
  /**
   * Bulk approve requests
   */
  async bulkApproveRequests(requestIds, approvalData) {
    try {
      const currentUser = this.getCurrentUser();
      if (!this.canApproveRequests()) {
        throw new Error('You do not have permission to approve emergency requests');
      }
      
      const promises = requestIds.map(id => 
        this.approveEmergencyRequest(id, {
          ...approvalData,
          comments: approvalData.comments || `Bulk approved by ${currentUser.name || currentUser.email}`
        })
      );
      
      const results = await Promise.all(promises);
      
      return {
        success: true,
        approvedCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        results: results
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk approve emergency requests');
    }
  }
  
  /**
   * Bulk reject requests
   */
  async bulkRejectRequests(requestIds, rejectionData) {
    try {
      const currentUser = this.getCurrentUser();
      if (!this.canApproveRequests()) {
        throw new Error('You do not have permission to reject emergency requests');
      }
      
      const promises = requestIds.map(id => 
        this.rejectEmergencyRequest(id, {
          ...rejectionData,
          comments: rejectionData.comments || `Bulk rejected by ${currentUser.name || currentUser.email}`
        })
      );
      
      const results = await Promise.all(promises);
      
      return {
        success: true,
        rejectedCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        results: results
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk reject emergency requests');
    }
  }
  
  // =========================== EXISTING METHODS (updated) ===========================
  
  /**
   * Get emergency ambulance requests with filtering
   */
  async getEmergencyRequests(params = {}) {
    try {
      const response = await healthcareAPI.emergencies.list(params);
      
      return {
        success: true,
        data: response.data,
        requests: response.data.results || response.data,
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch emergency requests');
    }
  }
  
  /**
   * Get single emergency request by ID
   */
  async getEmergencyRequest(id) {
    try {
      const response = await healthcareAPI.emergencies.get(id);
      
      return {
        success: true,
        data: response.data,
        request: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch emergency request');
    }
  }
  
  /**
   * Update emergency request status
   */
  async updateEmergencyStatus(id, status, additionalData = {}) {
    try {
      const response = await healthcareAPI.emergencies.updateStatus(id, status, additionalData);
      
      return {
        success: true,
        data: response.data,
        request: response.data,
        message: `Emergency request status updated to ${this.getStatusText(status)}`
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to update emergency status');
    }
  }
  
  /**
   * Dispatch ambulance to emergency request (requires approval)
   */
  async dispatchAmbulance(requestId, ambulanceData) {
    try {
      // Check if request is approved
      const request = await this.getEmergencyRequest(requestId);
      if (!request.success) {
        throw new Error('Emergency request not found');
      }
      
      if (request.data.approval_status !== 'approved') {
        throw new Error('Emergency request must be approved before dispatch');
      }
      
      const updateData = {
        status: 'D',
        assigned_ambulance: ambulanceData.ambulanceId,
        hospital_destination: ambulanceData.hospitalDestination,
        dispatched_at: new Date().toISOString(),
        dispatched_by: this.getCurrentUser()?.id,
        dispatched_by_name: this.getCurrentUser()?.name || this.getCurrentUser()?.email,
        ...ambulanceData
      };
      
      const response = await this.updateEmergencyStatus(requestId, 'D', updateData);
      
      return {
        ...response,
        message: `Ambulance ${ambulanceData.ambulanceId} dispatched successfully`
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to dispatch ambulance');
    }
  }
  
  /**
   * Mark ambulance as arrived
   */
  async markArrived(requestId, additionalData = {}) {
    try {
      const response = await this.updateEmergencyStatus(requestId, 'A', {
        arrived_at: new Date().toISOString(),
        ...additionalData
      });
      
      return {
        ...response,
        message: 'Ambulance marked as arrived'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to mark ambulance as arrived');
    }
  }
  
  /**
   * Mark as in transit to hospital
   */
  async markInTransit(requestId, additionalData = {}) {
    try {
      const response = await this.updateEmergencyStatus(requestId, 'T', {
        in_transit_at: new Date().toISOString(),
        ...additionalData
      });
      
      return {
        ...response,
        message: 'Emergency marked as in transit'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to mark as in transit');
    }
  }
  
  /**
   * Complete emergency request
   */
  async completeEmergency(requestId, additionalData = {}) {
    try {
      const response = await this.updateEmergencyStatus(requestId, 'C', {
        completed_at: new Date().toISOString(),
        completed_by: this.getCurrentUser()?.id,
        completed_by_name: this.getCurrentUser()?.name || this.getCurrentUser()?.email,
        ...additionalData
      });
      
      return {
        ...response,
        message: 'Emergency request completed successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to complete emergency request');
    }
  }
  
  // =========================== DISEASE SURVEILLANCE INTEGRATION ===========================
  
  /**
   * Get emergency requests by suspected disease
   */
  async getByDisease(disease) {
    try {
      const response = await healthcareAPI.emergencies.getByDisease(disease);
      
      return {
        success: true,
        data: response.data,
        disease: response.data.disease,
        requests: response.data.requests || [],
        totalRequests: response.data.total_requests || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch emergency requests by disease');
    }
  }
  
  /**
   * Get critical cases from symptom analysis
   */
  async getCriticalCases() {
    try {
      const response = await healthcareAPI.emergencies.getCriticalCases();
      
      return {
        success: true,
        data: response.data,
        criticalRequests: response.data.critical_requests || [],
        totalCriticalSessions: response.data.total_critical_sessions || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch critical cases');
    }
  }
  
  // =========================== GEOLOCATION SERVICES ===========================
  
  /**
   * Get user's current location
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            gps_coordinates: `${position.coords.latitude},${position.coords.longitude}`
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }
  
  /**
   * Find nearest hospitals based on location
   */
  async findNearestHospitals(latitude, longitude, radius = 10) {
    try {
      // This would typically integrate with a hospital database or maps API
      // For now, we'll simulate with mock data
      const mockHospitals = [
        {
          id: 1,
          name: 'Central Hospital',
          distance: 2.5,
          address: '123 Main St, City Center',
          phone: '+1-555-0101',
          emergency_services: true
        },
        {
          id: 2,
          name: 'Regional Medical Center',
          distance: 4.8,
          address: '456 Health Ave, Medical District',
          phone: '+1-555-0202',
          emergency_services: true
        },
        {
          id: 3,
          name: 'Community Hospital',
          distance: 7.2,
          address: '789 Care Blvd, Suburb',
          phone: '+1-555-0303',
          emergency_services: true
        }
      ];
      
      return {
        success: true,
        hospitals: mockHospitals,
        nearest: mockHospitals[0]
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to find nearest hospitals');
    }
  }
  
  // =========================== REAL-TIME TRACKING ===========================
  
  /**
   * Get real-time status of emergency request
   */
  async getRealtimeStatus(requestId) {
    try {
      const response = await this.getEmergencyRequest(requestId);
      
      return {
        success: true,
        status: response.data.status,
        statusText: this.getStatusText(response.data.status),
        approvalStatus: response.data.approval_status,
        approvalStatusText: this.getApprovalStatusText(response.data.approval_status),
        lastUpdated: response.data.updated_at || response.data.request_time,
        estimatedArrival: this.calculateEstimatedArrival(response.data),
        assignedAmbulance: response.data.assigned_ambulance,
        hospitalDestination: response.data.hospital_destination,
        approvedBy: response.data.approved_by_name,
        approvedAt: response.data.approved_at
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get real-time status');
    }
  }
  
  /**
   * Calculate estimated arrival time
   */
  calculateEstimatedArrival(request) {
    if (!request.assigned_ambulance || request.status === 'C') {
      return null;
    }
    
    const now = new Date();
    let estimatedMinutes;
    
    switch (request.status) {
      case 'P':
        estimatedMinutes = 15; // Dispatch + travel time
        break;
      case 'D':
        estimatedMinutes = 10; // Travel time
        break;
      case 'A':
        estimatedMinutes = 5; // Loading time
        break;
      case 'T':
        estimatedMinutes = 20; // Hospital travel time
        break;
      default:
        return null;
    }
    
    const estimatedTime = new Date(now.getTime() + estimatedMinutes * 60000);
    return estimatedTime.toISOString();
  }
  
  // =========================== STATISTICS AND ANALYTICS ===========================
  
  /**
   * Get emergency request statistics
   */
  async getEmergencyStats(dateRange = 'week') {
    try {
      const params = { range: dateRange };
      const response = await healthcareAPI.emergencies.list(params);
      
      const requests = response.data.results || response.data;
      
      return {
        success: true,
        stats: this.calculateStats(requests),
        totalRequests: requests.length,
        dateRange
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get emergency statistics');
    }
  }
  
  /**
   * Calculate statistics from requests data
   */
  calculateStats(requests) {
    const stats = {
      total: requests.length,
      pending: 0,
      dispatched: 0,
      arrived: 0,
      inTransit: 0,
      completed: 0,
      // Approval stats
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      byDisease: {},
      averageResponseTime: 0,
      criticalCases: 0,
      averageApprovalTime: 0
    };
    
    let totalApprovalTime = 0;
    let approvedCount = 0;
    
    requests.forEach(request => {
      // Status counts
      switch (request.status) {
        case 'P': stats.pending++; break;
        case 'D': stats.dispatched++; break;
        case 'A': stats.arrived++; break;
        case 'T': stats.inTransit++; break;
        case 'C': stats.completed++; break;
      }
      
      // Approval status counts
      switch (request.approval_status) {
        case 'pending': stats.pendingApproval++; break;
        case 'approved': stats.approved++; break;
        case 'rejected': stats.rejected++; break;
      }
      
      // Calculate approval time
      if (request.approval_status === 'approved' && request.approved_at && request.request_time) {
        const approvalTime = new Date(request.approved_at) - new Date(request.request_time);
        totalApprovalTime += approvalTime;
        approvedCount++;
      }
      
      // Disease tracking
      if (request.suspected_disease) {
        stats.byDisease[request.suspected_disease] = 
          (stats.byDisease[request.suspected_disease] || 0) + 1;
      }
      
      // Critical cases (could be enhanced with severity scoring)
      if (request.condition_description?.toLowerCase().includes('critical') ||
          request.condition_description?.toLowerCase().includes('severe')) {
        stats.criticalCases++;
      }
    });
    
    // Calculate average approval time in minutes
    if (approvedCount > 0) {
      stats.averageApprovalTime = Math.round(totalApprovalTime / approvedCount / 60000);
    }
    
    return stats;
  }
  
  // =========================== EMERGENCY WORKFLOWS ===========================
  
  /**
   * Quick emergency request from symptom checker
   */
  async createFromSymptomSession(sessionId, locationData) {
    try {
      // Get symptom session data
      const sessionResponse = await healthcareAPI.symptomSessions.get(sessionId);
      const session = sessionResponse.data;
      
      // Create emergency request with symptom data
      const requestData = {
        patient: session.patient_id,
        location: locationData.address || 'Current location',
        gps_coordinates: locationData.gps_coordinates,
        condition_description: this.formatConditionFromSymptoms(session),
        suspected_disease: session.primary_disease_name,
        symptom_session_id: sessionId,
        priority: this.determinePriorityFromSymptoms(session)
      };
      
      return await this.createEmergencyRequest(requestData);
    } catch (error) {
      throw this.handleError(error, 'Failed to create emergency request from symptom session');
    }
  }
  
  /**
   * Format condition description from symptom session
   */
  formatConditionFromSymptoms(session) {
    let description = `Patient reports: ${session.symptoms?.join(', ') || 'symptoms reported'}`;
    
    if (session.severity_level) {
      description += `\nSeverity: ${session.severity_level}`;
    }
    
    if (session.primary_disease_name) {
      description += `\nSuspected condition: ${session.primary_disease_name}`;
    }
    
    if (session.recommendation) {
      description += `\nRecommendation: ${session.recommendation}`;
    }
    
    return description;
  }
  
  /**
   * Determine priority from symptom session
   */
  determinePriorityFromSymptoms(session) {
    if (session.severity_level === 'high' || session.recommendation?.toLowerCase().includes('emergency')) {
      return 'critical';
    } else if (session.severity_level === 'medium') {
      return 'urgent';
    }
    return 'normal';
  }
  
  // =========================== UTILITY METHODS ===========================
  
  /**
   * Validate emergency request data with enhanced patient checking
   */
  validateEmergencyRequest(data) {
    const errors = [];
    
    if (!data.patient) errors.push('Patient is required');
    if (!data.location) errors.push('Location is required');
    if (!data.condition_description) errors.push('Condition description is required');
    
    // Validate GPS coordinates format if provided
    if (data.gps_coordinates) {
      const gpsRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
      if (!gpsRegex.test(data.gps_coordinates)) {
        errors.push('Invalid GPS coordinates format. Use "latitude,longitude"');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get human-readable status text
   */
  getStatusText(status) {
    const statusMap = {
      'P': 'Pending',
      'D': 'Dispatched',
      'A': 'Arrived',
      'T': 'In Transit',
      'C': 'Completed'
    };
    return statusMap[status] || 'Unknown';
  }
  
  /**
   * Get human-readable approval status text
   */
  getApprovalStatusText(approvalStatus) {
    const statusMap = {
      'pending': 'Pending Approval',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusMap[approvalStatus] || 'Unknown';
  }
  
  /**
   * Get status color for UI
   */
  getStatusColor(status) {
    const colorMap = {
      'P': 'yellow',   // Pending
      'D': 'blue',     // Dispatched
      'A': 'green',    // Arrived
      'T': 'orange',   // In Transit
      'C': 'gray'      // Completed
    };
    return colorMap[status] || 'gray';
  }
  
  /**
   * Get approval status color for UI
   */
  getApprovalStatusColor(approvalStatus) {
    const colorMap = {
      'pending': 'yellow',   // Pending
      'approved': 'green',   // Approved
      'rejected': 'red'      // Rejected
    };
    return colorMap[approvalStatus] || 'gray';
  }
  
  /**
   * Format emergency request for display
   */
  formatEmergencyRequest(request) {
    const requestTime = new Date(request.request_time);
    
    return {
      id: request.id,
      patient: request.patient_name || 'Unknown Patient',
      location: request.location,
      gpsCoordinates: request.gps_coordinates,
      condition: request.condition_description,
      status: request.status,
      statusText: this.getStatusText(request.status),
      statusColor: this.getStatusColor(request.status),
      approvalStatus: request.approval_status || 'pending',
      approvalStatusText: this.getApprovalStatusText(request.approval_status || 'pending'),
      approvalStatusColor: this.getApprovalStatusColor(request.approval_status || 'pending'),
      assignedAmbulance: request.assigned_ambulance,
      hospitalDestination: request.hospital_destination,
      suspectedDisease: request.suspected_disease,
      diseaseInfo: request.suspected_disease_info,
      requestTime: requestTime,
      formattedTime: requestTime.toLocaleString(),
      timeAgo: this.getTimeAgo(requestTime),
      priority: this.calculatePriority(request),
      approvedBy: request.approved_by_name,
      approvedAt: request.approved_at,
      approvalComments: request.approval_comments,
      recommendedHospital: request.recommended_hospital,
      urgencyLevel: request.urgency_level
    };
  }
  
  /**
   * Calculate priority level
   */
  calculatePriority(request) {
    // Use priority override if set during approval
    if (request.priority_override) {
      return request.priority_override;
    }
    
    let priority = 'normal';
    
    // Check for critical keywords
    const criticalKeywords = ['critical', 'severe', 'unconscious', 'cardiac', 'stroke'];
    const description = request.condition_description?.toLowerCase() || '';
    
    if (criticalKeywords.some(keyword => description.includes(keyword))) {
      priority = 'critical';
    }
    
    // Check disease severity
    if (request.suspected_disease_info?.emergency_threshold) {
      if (request.suspected_disease_info.emergency_threshold === 'high') {
        priority = 'critical';
      } else if (request.suspected_disease_info.emergency_threshold === 'medium') {
        priority = 'urgent';
      }
    }
    
    // Check elapsed time
    const elapsed = Date.now() - new Date(request.request_time).getTime();
    const minutesElapsed = elapsed / (1000 * 60);
    
    if (minutesElapsed > 30 && request.status === 'P') {
      priority = priority === 'normal' ? 'urgent' : priority;
    }
    
    return priority;
  }
  
  /**
   * Get time ago text
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
  
  /**
   * Handle API errors consistently
   */
  handleError(error, defaultMessage) {
    console.error('Emergency Service Error:', error);
    
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'object') {
        const errors = Object.values(data).flat().join(', ');
        return new Error(errors || defaultMessage);
      }
    }
    
    return new Error(error.message || defaultMessage);
  }
  
  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  
  /**
   * Check if user has specific role
   */
  hasRole(requiredRole) {
    const user = this.getCurrentUser();
    return user?.role?.name === requiredRole;
  }
  
  /**
   * Check if user can manage emergency requests
   */
  canManageEmergencies() {
    const user = this.getCurrentUser();
    return ['Admin', 'Nurse', 'Doctor'].includes(user?.role?.name);
  }
  
  /**
   * Check if user can approve emergency requests
   */
  canApproveRequests() {
    const user = this.getCurrentUser();
    return ['Admin', 'Doctor', 'Nurse', 'Emergency_Coordinator'].includes(user?.role?.name);
  }
  
  /**
   * Check if user can create emergency requests
   */
  canCreateEmergencyRequests() {
    const user = this.getCurrentUser();
    return user && user.role; // Any logged-in user can create emergency requests
  }
  
  /**
   * Check if user can view emergency requests
   */
  canViewEmergencyRequests() {
    const user = this.getCurrentUser();
    return user && user.role; // Any logged-in user can view emergency requests
  }
  
  /**
   * Get approval workflow status
   */
  getApprovalWorkflowStatus(request) {
    const status = {
      canApprove: false,
      canReject: false,
      canDispatch: false,
      canUpdate: false,
      isApproved: false,
      isRejected: false,
      isPending: false
    };
    
    if (!request || !this.canApproveRequests()) {
      return status;
    }
    
    switch (request.approval_status) {
      case 'pending':
        status.isPending = true;
        status.canApprove = true;
        status.canReject = true;
        break;
      case 'approved':
        status.isApproved = true;
        status.canDispatch = request.status === 'P'; // Can dispatch if still pending
        status.canUpdate = true;
        break;
      case 'rejected':
        status.isRejected = true;
        // Rejected requests can be re-approved if user has permission
        status.canApprove = true;
        break;
    }
    
    return status;
  }
  
  /**
   * Get emergency request metrics for dashboard
   */
  async getEmergencyMetrics(dateRange = 'week') {
    try {
      const stats = await this.getEmergencyStats(dateRange);
      
      if (!stats.success) {
        throw new Error('Failed to get emergency statistics');
      }
      
      const metrics = {
        totalRequests: stats.stats.total,
        pendingApproval: stats.stats.pendingApproval,
        approved: stats.stats.approved,
        rejected: stats.stats.rejected,
        dispatched: stats.stats.dispatched,
        completed: stats.stats.completed,
        criticalCases: stats.stats.criticalCases,
        averageApprovalTime: stats.stats.averageApprovalTime,
        approvalRate: stats.stats.total > 0 ? Math.round((stats.stats.approved / stats.stats.total) * 100) : 0,
        rejectionRate: stats.stats.total > 0 ? Math.round((stats.stats.rejected / stats.stats.total) * 100) : 0,
        completionRate: stats.stats.approved > 0 ? Math.round((stats.stats.completed / stats.stats.approved) * 100) : 0
      };
      
      return {
        success: true,
        metrics: metrics,
        dateRange: dateRange
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get emergency metrics');
    }
  }
  
  /**
   * Get emergency requests that need attention
   */
  async getRequestsNeedingAttention() {
    try {
      const allRequests = await this.getEmergencyRequests({ ordering: '-request_time' });
      
      if (!allRequests.success) {
        throw new Error('Failed to get emergency requests');
      }
      
      const now = new Date();
      const requests = allRequests.requests;
      
      const needingAttention = requests.filter(request => {
        const requestTime = new Date(request.request_time);
        const minutesElapsed = (now - requestTime) / (1000 * 60);
        
        // Requests needing attention:
        // 1. Pending approval for more than 15 minutes
        // 2. Approved but not dispatched for more than 30 minutes
        // 3. Dispatched but not arrived for more than 45 minutes
        // 4. Critical cases pending for more than 5 minutes
        
        const formatted = this.formatEmergencyRequest(request);
        
        if (formatted.priority === 'critical' && request.approval_status === 'pending' && minutesElapsed > 5) {
          return true;
        }
        
        if (request.approval_status === 'pending' && minutesElapsed > 15) {
          return true;
        }
        
        if (request.approval_status === 'approved' && request.status === 'P' && minutesElapsed > 30) {
          return true;
        }
        
        if (request.status === 'D' && minutesElapsed > 45) {
          return true;
        }
        
        return false;
      });
      
      return {
        success: true,
        requests: needingAttention,
        count: needingAttention.length
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get requests needing attention');
    }
  }
  
  /**
   * Send notification for emergency request
   */
  async sendEmergencyNotification(requestId, notificationType, recipients = []) {
    try {
      const request = await this.getEmergencyRequest(requestId);
      
      if (!request.success) {
        throw new Error('Emergency request not found');
      }
      
      const formatted = this.formatEmergencyRequest(request.data);
      
      const notificationData = {
        type: notificationType,
        request_id: requestId,
        request_data: formatted,
        recipients: recipients,
        timestamp: new Date().toISOString(),
        sender: this.getCurrentUser()?.name || 'System'
      };
      
      // This would typically integrate with a notification service
      // For now, we'll just log the notification
      console.log('📢 Emergency Notification:', notificationData);
      
      return {
        success: true,
        message: 'Notification sent successfully',
        notification: notificationData
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to send emergency notification');
    }
  }
  
  /**
   * Generate emergency report
   */
  async generateEmergencyReport(dateRange = 'month', format = 'json') {
    try {
      const stats = await this.getEmergencyStats(dateRange);
      const metrics = await this.getEmergencyMetrics(dateRange);
      
      if (!stats.success || !metrics.success) {
        throw new Error('Failed to generate report data');
      }
      
      const report = {
        generated_at: new Date().toISOString(),
        generated_by: this.getCurrentUser()?.name || 'System',
        date_range: dateRange,
        summary: {
          total_requests: stats.stats.total,
          approval_metrics: {
            pending: stats.stats.pendingApproval,
            approved: stats.stats.approved,
            rejected: stats.stats.rejected,
            approval_rate: metrics.metrics.approvalRate,
            rejection_rate: metrics.metrics.rejectionRate,
            average_approval_time: metrics.metrics.averageApprovalTime
          },
          operational_metrics: {
            dispatched: stats.stats.dispatched,
            completed: stats.stats.completed,
            completion_rate: metrics.metrics.completionRate,
            critical_cases: stats.stats.criticalCases
          },
          disease_breakdown: stats.stats.byDisease
        },
        detailed_stats: stats.stats,
        metrics: metrics.metrics
      };
      
      return {
        success: true,
        report: report,
        format: format
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to generate emergency report');
    }
  }
  
  /**
   * Validate approval permissions
   */
  validateApprovalPermissions(action) {
    const user = this.getCurrentUser();
    
    if (!user) {
      throw new Error('User must be logged in to perform this action');
    }
    
    if (!this.canApproveRequests()) {
      throw new Error(`You do not have permission to ${action} emergency requests`);
    }
    
    return true;
  }
  
  /**
   * Get emergency request audit trail
   */
  async getEmergencyAuditTrail(requestId) {
    try {
      const response = await healthcareAPI.emergencies.getAuditTrail(requestId);
      
      return {
        success: true,
        auditTrail: response.data.audit_trail || [],
        request: response.data.request
      };
    } catch (error) {
      // If audit trail endpoint doesn't exist, create a simple trail from request data
      try {
        const request = await this.getEmergencyRequest(requestId);
        if (request.success) {
          const trail = this.createAuditTrailFromRequest(request.data);
          return {
            success: true,
            auditTrail: trail,
            request: request.data
          };
        }
      } catch (fallbackError) {
        throw this.handleError(fallbackError, 'Failed to get audit trail');
      }
      
      throw this.handleError(error, 'Failed to get emergency audit trail');
    }
  }
  
  /**
   * Create audit trail from request data
   */
  createAuditTrailFromRequest(request) {
    const trail = [];
    
    // Request created
    trail.push({
      timestamp: request.request_time,
      action: 'created',
      user: request.created_by_name || 'System',
      details: 'Emergency request created'
    });
    
    // Approval events
    if (request.approval_status === 'approved' && request.approved_at) {
      trail.push({
        timestamp: request.approved_at,
        action: 'approved',
        user: request.approved_by_name || 'System',
        details: `Request approved. Comments: ${request.approval_comments || 'None'}`
      });
    }
    
    if (request.approval_status === 'rejected' && request.approved_at) {
      trail.push({
        timestamp: request.approved_at,
        action: 'rejected',
        user: request.approved_by_name || 'System',
        details: `Request rejected. Comments: ${request.approval_comments || 'None'}`
      });
    }
    
    // Dispatch events
    if (request.status === 'D' && request.dispatched_at) {
      trail.push({
        timestamp: request.dispatched_at,
        action: 'dispatched',
        user: request.dispatched_by_name || 'System',
        details: `Ambulance ${request.assigned_ambulance} dispatched to ${request.hospital_destination}`
      });
    }
    
    // Arrival events
    if (request.status === 'A' && request.arrived_at) {
      trail.push({
        timestamp: request.arrived_at,
        action: 'arrived',
        user: 'System',
        details: 'Ambulance arrived at location'
      });
    }
    
    // In transit events
    if (request.status === 'T' && request.in_transit_at) {
      trail.push({
        timestamp: request.in_transit_at,
        action: 'in_transit',
        user: 'System',
        details: 'Patient in transit to hospital'
      });
    }
    
    // Completion events
    if (request.status === 'C' && request.completed_at) {
      trail.push({
        timestamp: request.completed_at,
        action: 'completed',
        user: request.completed_by_name || 'System',
        details: 'Emergency request completed'
      });
    }
    
    return trail.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

// Create and export singleton instance
const emergencyAmbulanceService = new EmergencyAmbulanceService();

export default emergencyAmbulanceService;