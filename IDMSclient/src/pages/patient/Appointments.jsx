// src/pages/patient/PatientAppointments.jsx
import { useState, useEffect } from 'react';
import appointmentService from '../../services/appointmentService';
import { authAPI, apiUtils } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Stethoscope,
  CalendarDays,
  FileText,
  Phone,
  Mail,
  MapPin,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell,
  Star,
  Activity,
  Building,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Clinic-First Booking Flow
  const [bookingStep, setBookingStep] = useState(1); // 1: Clinic, 2: Doctor, 3: DateTime, 4: Details
  const [availableClinics, setAvailableClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  
  // Booking form data
  const [bookingData, setBookingData] = useState({
    clinic: '',
    healthcare_provider: '',
    appointment_date: '',
    reason: '',
    symptoms: ''
  });
  
  const currentUser = authAPI.getCurrentUser();

  useEffect(() => {
    fetchAppointments();
    // Clear success message after 5 seconds
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getAppointments();
      setAppointments(response.appointments);
      setError('');
    } catch (err) {
      setError('Failed to fetch appointments. Please try again.');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // ======================== CLINIC-FIRST BOOKING FLOW ========================
  
  const startBookingFlow = async () => {
    try {
      setError('');
      setLoading(true);
      
      console.log('🔍 Starting booking flow debug...');
      console.log('Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
      console.log('Current user:', authAPI.getCurrentUser());
      
      // Try multiple approaches to get clinics
      let clinics = [];
      
      // Approach 1: Use appointment service
      try {
        console.log('🏥 Approach 1: Appointment service...');
        const clinicsResponse = await appointmentService.getAvailableClinics();
        console.log('Appointment service response:', clinicsResponse);
        clinics = clinicsResponse.clinics || [];
      } catch (err) {
        console.log('❌ Appointment service failed:', err.message);
      }
      
      // Approach 2: Direct healthcareAPI call
      if (clinics.length === 0) {
        try {
          console.log('🏥 Approach 2: Direct healthcareAPI...');
          const response = await healthcareAPI.clinics.list();
          console.log('HealthcareAPI response:', response);
          clinics = response.data?.results || response.data || [];
        } catch (err) {
          console.log('❌ HealthcareAPI failed:', err.message);
        }
      }
      
      // Approach 3: Direct fetch call
      if (clinics.length === 0) {
        try {
          console.log('🏥 Approach 3: Direct fetch...');
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/clinics/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Direct fetch response:', data);
            clinics = data.results || data || [];
          } else {
            console.log('Direct fetch failed:', response.status, await response.text());
          }
        } catch (err) {
          console.log('❌ Direct fetch failed:', err.message);
        }
      }
      
      // Approach 4: Use test data if all else fails
      if (clinics.length === 0) {
        console.log('🏥 Approach 4: Using test data...');
        clinics = [
          {
            id: 1,
            name: 'Central Hospital',
            address: '123 Main Street, City',
            phone_number: '+1-555-0100',
            email: 'info@central.com',
            is_public: true,
            doctors_count: 5
          },
          {
            id: 2,
            name: 'Community Health Center',
            address: '456 Oak Avenue, City',
            phone_number: '+1-555-0200',
            email: 'info@community.com',
            is_public: true,
            doctors_count: 3
          }
        ];
        setError('Using test data - please check your backend connection');
      }
      
      console.log('✅ Final clinics:', clinics);
      console.log(`Found ${clinics.length} clinics`);
      
      // CRITICAL: Set clinics BEFORE setting modal state
      setAvailableClinics(clinics);
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('📊 State check - availableClinics will be:', clinics);
      
      setBookingStep(1);
      setShowBookingModal(true);
      resetBookingData();
      
    } catch (err) {
      console.error('❌ Complete booking flow failed:', err);
      setError(`Failed to load clinics: ${err.message}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSelection = async (clinic) => {
    try {
      setLoading(true);
      setSelectedClinic(clinic);
      
      // Step 2: Get doctors at selected clinic
      const doctorsResponse = await appointmentService.getClinicDoctors(clinic.id);
      setAvailableDoctors(doctorsResponse.doctors);
      setBookingStep(2);
    } catch (err) {
      setError('Failed to load doctors for this clinic.');
      console.error('Error loading doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelection = async (doctor) => {
    try {
      setSelectedDoctor(doctor);
      setBookingStep(3);
      
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      
      // No need to load availability anymore - user will pick their own time
      console.log('✅ Doctor selected, proceeding to date/time selection');
    } catch (err) {
      setError('Failed to select doctor.');
      console.error('Error selecting doctor:', err);
    }
  };

  const loadDoctorAvailability = async (doctorId, date) => {
    try {
      setLoading(true);
      console.log(`🩺 Loading availability for doctor ${doctorId} on ${date}`);
      
      // Try the real endpoint first
      let availabilityResponse;
      try {
        availabilityResponse = await appointmentService.getDoctorAvailability(
          doctorId, 
          selectedClinic.id, 
          date
        );
      } catch (err) {
        console.log('❌ Real availability endpoint failed, generating mock data');
        
        // Generate mock availability data
        const mockSlots = generateMockTimeSlots(date);
        availabilityResponse = {
          success: true,
          data: {
            date: date,
            doctor: { id: doctorId },
            clinic: { id: selectedClinic.id },
            available: mockSlots.length > 0,
            time_slots: mockSlots
          },
          available: mockSlots.length > 0,
          timeSlots: mockSlots
        };
      }
      
      console.log('✅ Availability data:', availabilityResponse);
      setDoctorAvailability(availabilityResponse.data);
      setSelectedDate(date);
    } catch (err) {
      console.error('❌ Error loading availability:', err);
      setError('Failed to load availability for this date.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTimeSlots = (date) => {
    console.log('🕐 Generating mock time slots for:', date);
    
    const slots = [];
    const selectedDate = new Date(date);
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const currentHour = today.getHours();
    
    // Skip weekends for this example
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('⚠️ Weekend selected - no slots available');
      return [];
    }
    
    // Generate slots from 9 AM to 5 PM
    for (let hour = 9; hour < 17; hour++) {
      // Skip past hours for today
      if (isToday && hour <= currentHour) {
        continue;
      }
      
      // Create two slots per hour (on the hour and half past)
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const datetime = `${date}T${timeString}:00Z`;
        
        // Make most slots available (80% chance)
        const isAvailable = Math.random() > 0.2;
        
        slots.push({
          time: timeString,
          datetime: datetime,
          available: isAvailable
        });
      }
    }
    
    console.log(`✅ Generated ${slots.length} total slots, ${slots.filter(s => s.available).length} available`);
    return slots;
  };

  const handleDateTimeSelection = (date, time) => {
    // Combine date and time into datetime string
    const datetime = `${date}T${time}:00Z`;
    
    setSelectedTimeSlot({
      time: time,
      datetime: datetime,
      available: true // We assume it's available since user is picking
    });
    
    setSelectedDate(date);
    setBookingStep(4);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!selectedClinic || !selectedDoctor || !selectedTimeSlot || !bookingData.reason.trim()) {
        setError('Please complete all required fields');
        return;
      }

      const appointmentPayload = {
        clinic: selectedClinic.id,
        healthcare_provider: selectedDoctor.id,
        appointment_date: selectedTimeSlot.datetime,
        reason: bookingData.reason.trim(),
        symptoms: bookingData.symptoms.trim()
      };

      await appointmentService.bookAppointment(appointmentPayload);
      setSuccess('Appointment booked successfully! A nurse will review and approve your request shortly.');
      setShowBookingModal(false);
      resetBookingData();
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Failed to book appointment');
    }
  };

  const resetBookingData = () => {
    setBookingStep(1);
    setSelectedClinic(null);
    setSelectedDoctor(null);
    setDoctorAvailability(null);
    setSelectedDate('');
    setSelectedTimeSlot(null);
    // DON'T reset availableClinics here - that's the bug!
    // setAvailableClinics([]);  // REMOVED THIS LINE
    setAvailableDoctors([]);
    setBookingData({
      clinic: '',
      healthcare_provider: '',
      appointment_date: '',
      reason: '',
      symptoms: ''
    });
  };

  // ======================== APPOINTMENT ACTIONS ========================

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      await appointmentService.cancelAppointment(appointmentId);
      setSuccess('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    }
  };

  const handleEditAppointment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!editingAppointment.healthcare_provider || !editingAppointment.appointment_date || 
          !editingAppointment.appointment_time || !editingAppointment.reason.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      const appointmentDateTime = `${editingAppointment.appointment_date}T${editingAppointment.appointment_time}`;
      
      await appointmentService.updateAppointment(editingAppointment.id, {
        healthcare_provider: parseInt(editingAppointment.healthcare_provider),
        appointment_date: appointmentDateTime,
        reason: editingAppointment.reason.trim()
      });
      
      setSuccess('Appointment updated successfully');
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment');
    }
  };

  // ======================== UTILITY FUNCTIONS ========================

  const getStatusIcon = (status) => {
    switch (status) {
      case 'P': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'A': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'C': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'D': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'P': return 'Pending Approval';
      case 'A': return 'Approved';
      case 'C': return 'Cancelled';
      case 'D': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'C': return 'bg-red-100 text-red-800 border-red-200';
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isUpcoming = (appointment) => {
    return new Date(appointment.appointment_date) > new Date() && appointment.status !== 'C';
  };

  const canEditAppointment = (appointment) => {
    return appointment.status === 'P' && appointmentService.canModifyAppointment(appointment, 'Patient');
  };

  // Filter and sort appointments
  const filteredAndSortedAppointments = appointments
    .filter(appointment => {
      const matchesSearch = searchTerm === '' || 
        appointment.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        
        const appointmentDate = new Date(appointment.appointment_date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        switch (dateFilter) {
          case 'today':
            return appointmentDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return appointmentDate.toDateString() === tomorrow.toDateString();
          case 'this_week':
            return appointmentDate >= today && appointmentDate <= nextWeek;
          case 'upcoming':
            return appointmentDate >= today;
          case 'past':
            return appointmentDate < today;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.appointment_date);
          bValue = new Date(b.appointment_date);
          break;
        case 'provider':
          aValue = a.doctor_name?.toLowerCase() || '';
          bValue = b.doctor_name?.toLowerCase() || '';
          break;
        case 'status':
          const statusOrder = { 'A': 1, 'P': 2, 'D': 3, 'C': 4 };
          aValue = statusOrder[a.status] || 5;
          bValue = statusOrder[b.status] || 5;
          break;
        default:
          aValue = new Date(a.appointment_date);
          bValue = new Date(b.appointment_date);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Get today's date for min date input
  const today = new Date().toISOString().split('T')[0];

  // Get upcoming appointments
  const upcomingAppointments = appointments.filter(apt => 
    isUpcoming(apt) && apt.status === 'A'
  ).slice(0, 3);

  // Get pending appointments count
  const pendingCount = appointments.filter(apt => apt.status === 'P').length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Appointments</h1>
                <p className="text-gray-600">Manage your healthcare appointments and book new ones</p>
              </div>
              <button
                onClick={startBookingFlow}
                className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Book New Appointment
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700">{success}</p>
                <button
                  onClick={() => setSuccess('')}
                  className="ml-auto text-green-500 hover:text-green-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Pending Approval Alert */}
          {pendingCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-yellow-800">
                  You have <strong>{pendingCount}</strong> appointment{pendingCount !== 1 ? 's' : ''} pending nurse approval.
                  You'll receive an email notification once approved.
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {appointments.filter(apt => apt.status === 'P').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {appointments.filter(apt => apt.status === 'A').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {appointments.filter(apt => apt.status === 'D').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {upcomingAppointments.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Next Upcoming Appointments
              </h3>
              <div className="space-y-3">
                {upcomingAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appointment.doctor_name}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_date)}
                        </p>
                        <p className="text-sm text-blue-700">{appointment.clinic_name}</p>
                        <p className="text-xs text-gray-500">{appointment.reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowDetailsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 transition-colors p-2 hover:bg-blue-100 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by doctor, clinic, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="P">Pending Approval</option>
                  <option value="A">Approved</option>
                  <option value="C">Cancelled</option>
                  <option value="D">Completed</option>
                </select>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
                
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort);
                    setSortOrder(order);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="provider-asc">Doctor A-Z</option>
                  <option value="provider-desc">Doctor Z-A</option>
                  <option value="status-asc">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your appointments...</p>
              </div>
            ) : filteredAndSortedAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : "You haven't booked any appointments yet"}
                </p>
                {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
                  <button
                    onClick={startBookingFlow}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Your First Appointment
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAndSortedAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(appointment.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                          </div>
                          {isUpcoming(appointment) && appointment.status === 'A' && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                              Upcoming
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(appointment.appointment_date)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{appointment.doctor_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{appointment.clinic_name}</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{appointment.reason}</span>
                        </div>
                        
                        {appointment.notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Provider Notes:</strong> {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {canEditAppointment(appointment) && (
                          <>
                            <button
                              onClick={() => {
                                const appointmentDate = new Date(appointment.appointment_date);
                                setEditingAppointment({
                                  ...appointment,
                                  appointment_date: appointmentDate.toISOString().split('T')[0],
                                  appointment_time: appointmentDate.toTimeString().substring(0, 5),
                                  healthcare_provider: appointment.healthcare_provider?.id
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Edit Appointment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel Appointment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinic-First Booking Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Book New Appointment</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Step {bookingStep} of 4: {
                          bookingStep === 1 ? 'Select Clinic' :
                          bookingStep === 2 ? 'Choose Doctor' :
                          bookingStep === 3 ? 'Pick Date & Time' :
                          'Appointment Details'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        resetBookingData();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step <= bookingStep 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {step}
                          </div>
                          {step < 4 && (
                            <div className={`h-1 w-12 mx-2 ${
                              step < bookingStep ? 'bg-blue-600' : 'bg-gray-200'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  {/* Step 1: Select Clinic */}
                  {bookingStep === 1 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Select a Clinic</h3>
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-gray-600">Loading clinics...</p>
                        </div>
                      ) : availableClinics.length === 0 ? (
                        <div className="text-center py-8">
                          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">No Clinics Available</h4>
                          <p className="text-gray-600 mb-4">
                            There are currently no clinics available for booking appointments.
                          </p>
                          <button
                            onClick={startBookingFlow}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Retry Loading
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableClinics.map((clinic) => (
                            <div
                              key={clinic.id}
                              onClick={() => handleClinicSelection(clinic)}
                              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <Building className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{clinic.name}</h4>
                                    <p className="text-sm text-gray-600">{clinic.address}</p>
                                    {clinic.phone_number && (
                                      <p className="text-xs text-gray-500">{clinic.phone_number}</p>
                                    )}
                                    {clinic.doctors_count !== undefined && (
                                      <p className="text-xs text-blue-600">
                                        {clinic.doctors_count} doctor{clinic.doctors_count !== 1 ? 's' : ''} available
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Debug Information */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
                          <p><strong>Debug Info:</strong></p>
                          <p>Clinics loaded: {availableClinics.length}</p>
                          <p>Loading: {loading.toString()}</p>
                          <p>Booking step: {bookingStep}</p>
                          <p>Show modal: {showBookingModal.toString()}</p>
                          {availableClinics.length > 0 && (
                            <div className="mt-2">
                              <p><strong>First clinic:</strong></p>
                              <pre className="overflow-x-auto text-xs">
                                {JSON.stringify(availableClinics[0], null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Select Doctor */}
                  {bookingStep === 2 && selectedClinic && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setBookingStep(1)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <h3 className="text-lg font-medium text-gray-900">Choose a Doctor</h3>
                      </div>
                      
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Selected Clinic:</strong> {selectedClinic.name}
                        </p>
                      </div>

                      {loading ? (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-gray-600">Loading doctors...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableDoctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              onClick={() => handleDoctorSelection(doctor)}
                              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="bg-green-100 p-2 rounded-lg">
                                    <Stethoscope className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      Dr. {doctor.first_name} {doctor.last_name}
                                    </h4>
                                    {doctor.specialization && (
                                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Select Date & Time */}
                  {bookingStep === 3 && selectedDoctor && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setBookingStep(2)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <h3 className="text-lg font-medium text-gray-900">Pick Date & Time</h3>
                      </div>
                      
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Doctor:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                        </p>
                        <p className="text-sm text-blue-700">
                          <strong>Clinic:</strong> {selectedClinic.name}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Date *
                            </label>
                            <input
                              type="date"
                              min={today}
                              max={(() => {
                                const maxDate = new Date();
                                maxDate.setMonth(maxDate.getMonth() + 3); // 3 months ahead
                                return maxDate.toISOString().split('T')[0];
                              })()}
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Time *
                            </label>
                            <input
                              type="time"
                              min="08:00"
                              max="18:00"
                              step="900" // 15-minute intervals
                              value={selectedTimeSlot?.time || ''}
                              onChange={(e) => {
                                if (selectedDate && e.target.value) {
                                  handleDateTimeSelection(selectedDate, e.target.value);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Business hours: 8:00 AM - 6:00 PM
                            </p>
                          </div>
                        </div>

                        {selectedDate && selectedTimeSlot && (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-2">Selected Appointment Time</h4>
                            <div className="space-y-1 text-sm text-green-800">
                              <p><strong>Date:</strong> {formatDate(selectedTimeSlot.datetime)}</p>
                              <p><strong>Time:</strong> {selectedTimeSlot.time}</p>
                              <p><strong>Doctor:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                              <p><strong>Clinic:</strong> {selectedClinic.name}</p>
                            </div>
                            <button
                              onClick={() => setBookingStep(4)}
                              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              Continue to Details
                            </button>
                          </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">Please Note:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Your appointment request will be reviewed by a nurse</li>
                                <li>You'll receive confirmation once approved</li>
                                <li>If your preferred time is unavailable, we'll contact you with alternatives</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Appointment Details */}
                  {bookingStep === 4 && selectedDate && selectedTimeSlot && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setBookingStep(3)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
                      </div>
                      
                      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-2">Appointment Summary</h4>
                        <div className="space-y-1 text-sm text-green-800">
                          <p><strong>Clinic:</strong> {selectedClinic.name}</p>
                          <p><strong>Doctor:</strong> Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                          <p><strong>Date:</strong> {formatDate(selectedTimeSlot.datetime)}</p>
                          <p><strong>Time:</strong> {selectedTimeSlot.time}</p>
                        </div>
                      </div>

                      <form onSubmit={handleBookAppointment} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Visit *
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={bookingData.reason}
                            onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                            placeholder="Please describe the reason for your appointment..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={500}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {bookingData.reason.length}/500 characters
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Symptoms (Optional)
                          </label>
                          <textarea
                            rows={3}
                            value={bookingData.symptoms}
                            onChange={(e) => setBookingData({...bookingData, symptoms: e.target.value})}
                            placeholder="Describe any specific symptoms you're experiencing..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={300}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {bookingData.symptoms.length}/300 characters
                          </p>
                        </div>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">Important Notes:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Your appointment will be reviewed by a nurse before approval</li>
                                <li>You'll receive an email confirmation once approved</li>
                                <li>For urgent medical concerns, please visit the emergency room</li>
                                <li>Please arrive 15 minutes early for your appointment</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowBookingModal(false);
                              resetBookingData();
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!bookingData.reason.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Book Appointment
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Appointment Modal */}
          {editingAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Edit Appointment</h2>
                  <p className="text-sm text-gray-600 mt-1">Modify your appointment details</p>
                </div>
                
                <form onSubmit={handleEditAppointment} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={editingAppointment.appointment_date}
                        onChange={(e) => setEditingAppointment({...editingAppointment, appointment_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        required
                        min="08:00"
                        max="18:00"
                        value={editingAppointment.appointment_time}
                        onChange={(e) => setEditingAppointment({...editingAppointment, appointment_time: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Visit *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={editingAppointment.reason}
                      onChange={(e) => setEditingAppointment({...editingAppointment, reason: e.target.value})}
                      placeholder="Describe the reason for your appointment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={500}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingAppointment(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Update Appointment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Appointment Details Modal */}
          {showDetailsModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedAppointment.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                        {getStatusText(selectedAppointment.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                      <p className="text-gray-900 font-medium">{formatDate(selectedAppointment.appointment_date)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Time</label>
                      <p className="text-gray-900 font-medium">{formatTime(selectedAppointment.appointment_date)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Clinic</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedAppointment.clinic_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Healthcare Provider</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedAppointment.doctor_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Reason for Visit</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{selectedAppointment.reason}</p>
                    </div>
                  </div>
                  
                  {selectedAppointment.symptoms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Symptoms</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-900">{selectedAppointment.symptoms}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Provider Notes</label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.status === 'A' && isUpcoming(selectedAppointment) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Appointment Confirmed</p>
                          <p>Your appointment has been approved by our nursing staff. Please arrive 15 minutes early and bring a valid ID.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.status === 'P' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Pending Approval</p>
                          <p>Your appointment is being reviewed by our nursing staff. You'll receive an email notification once approved.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    {canEditAppointment(selectedAppointment) && (
                      <button
                        onClick={() => {
                          const appointmentDate = new Date(selectedAppointment.appointment_date);
                          setEditingAppointment({
                            ...selectedAppointment,
                            appointment_date: appointmentDate.toISOString().split('T')[0],
                            appointment_time: appointmentDate.toTimeString().substring(0, 5),
                            healthcare_provider: selectedAppointment.healthcare_provider?.id
                          });
                          setShowDetailsModal(false);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit Appointment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientAppointments;