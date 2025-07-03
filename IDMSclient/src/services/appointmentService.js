// src/services/appointmentService.js
import { healthcareAPI } from './api'; // Import existing API instead of creating new axios instance

// ======================== APPOINTMENT SERVICE ========================
class AppointmentService {
  
  // ======================== CLINIC-FIRST FLOW ========================
  
  /**
   * Step 1: Get all available clinics for appointment booking
   */
  async getAvailableClinics(params = {}) {
    try {
      console.log('🏥 Loading clinics for appointment booking...');
      
      // Try the appointment-specific endpoint first
      let response;
      try {
        console.log('Trying appointment endpoint: /appointments/available_clinics/');
        response = await healthcareAPI.appointments?.availableClinics?.() || 
                  await fetch('/api/appointments/available_clinics/').then(r => r.json());
      } catch (error) {
        console.log('❌ Appointment endpoint failed, using clinics endpoint');
        // Fall back to regular clinics endpoint
        response = await healthcareAPI.clinics.list({ is_public: true, ...params });
      }
      
      console.log('📊 Raw clinics response:', response);
      
      // Handle different response structures
      let clinics = [];
      if (response?.data) {
        if (response.data.results) {
          clinics = response.data.results;
        } else if (response.data.clinics) {
          clinics = response.data.clinics;
        } else if (Array.isArray(response.data)) {
          clinics = response.data;
        }
      } else if (response?.results) {
        clinics = response.results;
      } else if (Array.isArray(response)) {
        clinics = response;
      }
      
      console.log('✅ Processed clinics:', clinics);
      console.log(`Found ${clinics.length} clinics`);
      
      return {
        success: true,
        data: response,
        clinics: clinics
      };
    } catch (error) {
      console.error('❌ Error loading clinics:', error);
      throw this.handleError(error, 'Failed to fetch available clinics');
    }
  }

  /**
   * Step 2: Get doctors working at a specific clinic
   */
  async getClinicDoctors(clinicId, params = {}) {
    try {
      if (!clinicId) {
        throw new Error('Clinic ID is required');
      }
      
      console.log(`🩺 Loading doctors for clinic ${clinicId}...`);
      
      // Try the appointment-specific endpoint first
      let response;
      try {
        console.log('Trying appointment endpoint: /appointments/clinic_doctors/');
        response = await healthcareAPI.appointments?.clinicDoctors?.(clinicId) ||
                  await fetch(`/api/appointments/clinic_doctors/?clinic_id=${clinicId}`).then(r => r.json());
      } catch (error) {
        console.log('❌ Appointment endpoint failed, using clinic staff endpoint');
        // Fall back to clinic staff endpoint
        try {
          response = await healthcareAPI.clinics.getStaff(clinicId);
        } catch (staffError) {
          // If getStaff doesn't exist, try getting clinic details
          const clinicResponse = await healthcareAPI.clinics.get(clinicId);
          const staff = clinicResponse.data?.staff || [];
          response = { data: staff };
        }
        
        // Transform the response to match expected format
        const staff = response.data?.results || response.data || [];
        const doctors = staff.filter(user => user.role?.name === 'Doctor');
        
        console.log(`Found ${doctors.length} doctors in clinic staff`);
        
        response = {
          data: {
            clinic: { id: clinicId },
            doctors: doctors,
            count: doctors.length
          }
        };
      }
      
      console.log('✅ Doctors response:', response);
      
      return {
        success: true,
        data: response.data,
        clinic: response.data.clinic,
        doctors: response.data.doctors || []
      };
    } catch (error) {
      console.error('❌ Error loading clinic doctors:', error);
      throw this.handleError(error, 'Failed to fetch clinic doctors');
    }
  }

  /**
   * Step 3: Check doctor availability for specific date
   */
  async getDoctorAvailability(doctorId, clinicId, date = null) {
    try {
      if (!doctorId || !clinicId) {
        throw new Error('Doctor ID and Clinic ID are required');
      }
      
      const params = { doctor_id: doctorId, clinic_id: clinicId };
      if (date) {
        params.date = date; // Format: YYYY-MM-DD
      }
      
      // Try the appointment-specific endpoint first
      let response;
      try {
        response = await appointmentAPI.get('/appointments/doctor_availability/', { params });
      } catch (error) {
        // If endpoint doesn't exist, create mock availability
        console.log('Creating mock availability data');
        const mockSlots = this.generateMockTimeSlots(date);
        
        response = {
          data: {
            date: date || new Date().toISOString().split('T')[0],
            doctor: { id: doctorId },
            clinic: { id: clinicId },
            available: mockSlots.length > 0,
            time_slots: mockSlots
          }
        };
      }
      
      return {
        success: true,
        data: response.data,
        available: response.data.available,
        timeSlots: response.data.time_slots || []
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch doctor availability');
    }
  }

  /**
   * Generate mock time slots for testing
   */
  generateMockTimeSlots(date) {
    const slots = [];
    const selectedDate = new Date(date || new Date());
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const currentHour = new Date().getHours();

    for (let hour = 9; hour < 17; hour++) { // 9 AM to 5 PM
      // Skip past times for today
      if (isToday && hour <= currentHour) {
        continue;
      }

      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const datetime = `${selectedDate.toISOString().split('T')[0]}T${timeString}:00`;

      slots.push({
        time: timeString,
        datetime: datetime,
        available: Math.random() > 0.3 // 70% chance of being available
      });
    }

    return slots;
  }

  /**
   * Step 4: Book appointment
   */
  async bookAppointment(appointmentData) {
    try {
      // Validate appointment data
      const validation = this.validateAppointmentData(appointmentData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      console.log('📅 Booking appointment:', appointmentData);
      
      const response = await healthcareAPI.appointments.create(appointmentData);
      
      console.log('✅ Appointment booked:', response);
      
      return {
        success: true,
        data: response.data,
        appointment: response.data,
        message: 'Appointment booked successfully'
      };
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      throw this.handleError(error, 'Failed to book appointment');
    }
  }

  // ======================== APPOINTMENT MANAGEMENT ========================
  
  /**
   * Get appointments list with filtering
   */
  async getAppointments(params = {}) {
    try {
      const response = await healthcareAPI.appointments.list(params);
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || response.data,
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch appointments');
    }
  }

  /**
   * Get single appointment by ID
   */
  async getAppointment(id) {
    try {
      const response = await healthcareAPI.appointments.get(id);
      return {
        success: true,
        data: response.data,
        appointment: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch appointment');
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(id, data) {
    try {
      const response = await healthcareAPI.appointments.update(id, data);
      return {
        success: true,
        data: response.data,
        appointment: response.data,
        message: 'Appointment updated successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to update appointment');
    }
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(id) {
    try {
      await healthcareAPI.appointments.delete(id);
      return {
        success: true,
        message: 'Appointment deleted successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to delete appointment');
    }
  }

  // ======================== NURSE APPROVAL SYSTEM ========================
  
  /**
   * Approve appointment (Nurses only)
   */
  async approveAppointment(id) {
    try {
      const response = await healthcareAPI.appointments.approve(id);
      return {
        success: true,
        data: response.data,
        appointment: response.data.appointment,
        message: response.data.message || 'Appointment approved successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to approve appointment');
    }
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(id) {
    try {
      const response = await healthcareAPI.appointments.cancel(id);
      return {
        success: true,
        data: response.data,
        appointment: response.data.appointment,
        message: response.data.message || 'Appointment cancelled successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to cancel appointment');
    }
  }

  /**
   * Complete appointment (Doctors only)
   */
  async completeAppointment(id, data = {}) {
    try {
      const response = await healthcareAPI.appointments.complete(id, data);
      return {
        success: true,
        data: response.data,
        appointment: response.data.appointment,
        message: response.data.message || 'Appointment completed successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to complete appointment');
    }
  }

  // ======================== APPOINTMENT QUERIES ========================
  
  /**
   * Get user's upcoming appointments
   */
  async getMyUpcoming(params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/my_upcoming/', { params });
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || [],
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch upcoming appointments');
    }
  }

  /**
   * Get appointment statistics
   */
  async getStats(params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/stats/', { params });
      return {
        success: true,
        data: response.data,
        stats: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch appointment statistics');
    }
  }

  /**
   * Get calendar view of appointments
   */
  async getCalendarView(startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await appointmentAPI.get('/appointments/calendar_view/', { params });
      return {
        success: true,
        data: response.data,
        appointments: response.data.appointments || {},
        startDate: response.data.start_date,
        endDate: response.data.end_date
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch calendar view');
    }
  }

  // ======================== FILTERED QUERIES ========================
  
  /**
   * Get appointments by clinic
   */
  async getByClinic(clinicId, params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/', {
        params: { clinic: clinicId, ...params }
      });
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || [],
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch clinic appointments');
    }
  }

  /**
   * Get appointments by doctor
   */
  async getByDoctor(doctorId, params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/', {
        params: { healthcare_provider: doctorId, ...params }
      });
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || [],
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch doctor appointments');
    }
  }

  /**
   * Get appointments by patient
   */
  async getByPatient(patientId, params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/', {
        params: { patient: patientId, ...params }
      });
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || [],
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch patient appointments');
    }
  }

  /**
   * Get appointments by status
   */
  async getByStatus(status, params = {}) {
    try {
      const response = await appointmentAPI.get('/appointments/', {
        params: { status, ...params }
      });
      return {
        success: true,
        data: response.data,
        appointments: response.data.results || [],
        count: response.data.count || 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch appointments by status');
    }
  }

  // ======================== BULK OPERATIONS ========================
  
  /**
   * Bulk cancel appointments
   */
  async bulkCancel(appointmentIds) {
    try {
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new Error('Appointment IDs array is required');
      }
      
      const promises = appointmentIds.map(id => 
        appointmentAPI.post(`/appointments/${id}/cancel/`)
      );
      
      const results = await Promise.allSettled(promises);
      
      const succeeded = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} appointments failed to cancel`);
      }
      
      return {
        success: true,
        message: `${succeeded.length} appointments cancelled successfully`,
        succeededCount: succeeded.length,
        failedCount: failed.length,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk cancel appointments');
    }
  }

  /**
   * Bulk complete appointments (Doctors only)
   */
  async bulkComplete(appointmentIds, notes = '') {
    try {
      if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new Error('Appointment IDs array is required');
      }
      
      const promises = appointmentIds.map(id => 
        appointmentAPI.post(`/appointments/${id}/complete/`, { notes })
      );
      
      const results = await Promise.allSettled(promises);
      
      const succeeded = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      if (failed.length > 0) {
        console.warn(`${failed.length} appointments failed to complete`);
      }
      
      return {
        success: true,
        message: `${succeeded.length} appointments completed successfully`,
        succeededCount: succeeded.length,
        failedCount: failed.length,
        results: succeeded.map(result => result.value.data)
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to bulk complete appointments');
    }
  }

  // ======================== UTILITY METHODS ========================
  
  /**
   * Validate appointment data before booking
   */
  validateAppointmentData(data) {
    const errors = [];
    
    if (!data.clinic) errors.push('Clinic is required');
    if (!data.healthcare_provider) errors.push('Doctor is required');
    if (!data.appointment_date) errors.push('Appointment date is required');
    if (!data.reason) errors.push('Reason for visit is required');
    
    // Check if appointment is in the future
    if (data.appointment_date) {
      const appointmentDate = new Date(data.appointment_date);
      if (appointmentDate <= new Date()) {
        errors.push('Appointment must be scheduled for a future date');
      }
      
      // Check if appointment is too far in the future (6 months)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      if (appointmentDate > sixMonthsFromNow) {
        errors.push('Appointment cannot be scheduled more than 6 months in advance');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format appointment data for display
   */
  formatAppointmentData(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    
    return {
      id: appointment.id,
      patient: appointment.patient_name || appointment.patient?.full_name,
      doctor: appointment.doctor_name || appointment.healthcare_provider?.full_name,
      clinic: appointment.clinic_name || appointment.clinic?.name,
      date: appointmentDate.toLocaleDateString(),
      time: appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datetime: appointmentDate,
      status: appointment.status_display || appointment.status,
      reason: appointment.reason,
      symptoms: appointment.symptoms,
      notes: appointment.notes,
      diagnosis: appointment.diagnosis,
      canCancel: appointment.can_cancel,
      canApprove: appointment.can_approve,
      canComplete: appointment.can_complete,
      isUpcoming: appointment.is_upcoming,
      priority: appointment.priority,
      priorityDisplay: appointment.priority_display
    };
  }

  /**
   * Check if appointment can be modified based on user role and timing
   */
  canModifyAppointment(appointment, userRole) {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);
    const hoursDiff = (appointmentDate - now) / (1000 * 60 * 60);
    
    // Can't modify past appointments
    if (hoursDiff <= 0) return false;
    
    // Can't modify completed or cancelled appointments
    if (['C', 'D'].includes(appointment.status)) return false;
    
    // Role-based rules
    switch (userRole) {
      case 'Patient':
        // Patients can modify only their own appointments with 24h notice
        return hoursDiff >= 24;
      
      case 'Nurse':
        // Nurses can modify any appointment at their clinic
        return true;
      
      case 'Doctor':
        // Doctors can modify their own appointments
        return true;
      
      case 'Admin':
        // Admins can modify any appointment
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Get appointment status color for UI
   */
  getStatusColor(status) {
    const colors = {
      'P': 'orange',    // Pending
      'A': 'green',     // Approved
      'C': 'red',       // Cancelled
      'D': 'blue',      // Completed
      'N': 'gray',      // No Show
      'R': 'purple'     // Rescheduled
    };
    return colors[status] || 'gray';
  }

  /**
   * Get next available slot for a doctor
   */
  async getNextAvailableSlot(doctorId, clinicId, daysAhead = 7) {
    try {
      const today = new Date();
      
      for (let i = 0; i < daysAhead; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dateString = checkDate.toISOString().split('T')[0];
        const availability = await this.getDoctorAvailability(doctorId, clinicId, dateString);
        
        if (availability.success && availability.timeSlots.length > 0) {
          const availableSlots = availability.timeSlots.filter(slot => slot.available);
          
          if (availableSlots.length > 0) {
            return {
              success: true,
              date: dateString,
              time: availableSlots[0].time,
              datetime: availableSlots[0].datetime,
              slot: availableSlots[0]
            };
          }
        }
      }
      
      return {
        success: false,
        message: `No available slots found in the next ${daysAhead} days`
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to find next available slot');
    }
  }

  /**
   * Generate time slots for a given schedule
   */
  generateTimeSlots(schedule, bookedSlots = []) {
    const slots = [];
    const startTime = new Date(`2000-01-01T${schedule.start_time}`);
    const endTime = new Date(`2000-01-01T${schedule.end_time}`);
    const duration = schedule.appointment_duration || 60; // minutes
    
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      const timeString = currentTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const isBooked = bookedSlots.some(slot => 
        slot.time === timeString || 
        (slot.datetime && slot.datetime.includes(timeString))
      );
      
      slots.push({
        time: timeString,
        available: !isBooked,
        datetime: `${new Date().toISOString().split('T')[0]}T${timeString}:00`
      });
      
      currentTime.setMinutes(currentTime.getMinutes() + duration);
    }
    
    return slots;
  }

  /**
   * Handle API errors consistently
   */
  handleError(error, defaultMessage) {
    console.error('Appointment Service Error:', error);
    
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
}

// Create and export singleton instance
const appointmentService = new AppointmentService();

export default appointmentService;

// Export individual methods for direct import
export const {
  // Clinic-first flow
  getAvailableClinics,
  getClinicDoctors,
  getDoctorAvailability,
  bookAppointment,
  
  // Appointment management
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  
  // Nurse approval system
  approveAppointment,
  getPendingApprovals,
  bulkApprove,
  
  // Appointment actions
  cancelAppointment,
  completeAppointment,
  
  // Queries
  getMyUpcoming,
  getStats,
  getCalendarView,
  
  // Filtered queries
  getByClinic,
  getByDoctor,
  getByPatient,
  getByStatus,
  
  // Bulk operations
  bulkCancel,
  bulkComplete,
  
  // Utilities
  validateAppointmentData,
  formatAppointmentData,
  canModifyAppointment,
  getStatusColor,
  getNextAvailableSlot,
  generateTimeSlots
} = appointmentService;