// src/pages/patient/PatientAppointments.jsx
import { useState, useEffect } from 'react';
import { healthcareAPI, authAPI, apiUtils } from '../../services/api';
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
  Activity
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
  
  // Booking form data
  const [bookingData, setBookingData] = useState({
    healthcare_provider: '',
    appointment_date: '',
    appointment_time: '',
    reason: ''
  });
  
  // Available providers
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const currentUser = authAPI.getCurrentUser();

  useEffect(() => {
    fetchAppointments();
    fetchProviders();
    // Clear success message after 5 seconds
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await healthcareAPI.appointments.list();
      const appointmentsData = response.data.results || response.data || [];
      setAppointments(appointmentsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch appointments. Please try again.');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await apiUtils.userUtils.getMedicalStaff();
      const providersData = response.results || response || [];
      setProviders(providersData);
      setFilteredProviders(providersData);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!bookingData.healthcare_provider || !bookingData.appointment_date || 
          !bookingData.appointment_time || !bookingData.reason.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      // Combine date and time
      const appointmentDateTime = `${bookingData.appointment_date}T${bookingData.appointment_time}`;
      
      const appointmentPayload = {
        healthcare_provider: parseInt(bookingData.healthcare_provider),
        appointment_date: appointmentDateTime,
        reason: bookingData.reason.trim()
      };

      await healthcareAPI.appointments.create(appointmentPayload);
      setSuccess('Appointment booked successfully! You will receive a confirmation email shortly.');
      setShowBookingModal(false);
      resetBookingForm();
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      await healthcareAPI.appointments.cancel(appointmentId);
      setSuccess('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
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
      
      await healthcareAPI.appointments.update(editingAppointment.id, {
        healthcare_provider: parseInt(editingAppointment.healthcare_provider),
        appointment_date: appointmentDateTime,
        reason: editingAppointment.reason.trim()
      });
      
      setSuccess('Appointment updated successfully');
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

  const resetBookingForm = () => {
    setBookingData({
      healthcare_provider: '',
      appointment_date: '',
      appointment_time: '',
      reason: ''
    });
    setSelectedProvider(null);
    setAvailableSlots([]);
  };

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === parseInt(providerId));
    setSelectedProvider(provider);
    setBookingData({...bookingData, healthcare_provider: providerId});
    
    // Reset time selection when provider changes
    setBookingData(prev => ({...prev, appointment_time: ''}));
    setAvailableSlots([]);
  };

  const handleDateChange = (date) => {
    setBookingData({...bookingData, appointment_date: date, appointment_time: ''});
    if (date && selectedProvider) {
      generateAvailableSlots(date);
    }
  };

  const generateAvailableSlots = (date) => {
    // Simple time slot generation (8 AM to 6 PM, 30-minute intervals)
    const slots = [];
    const selectedDate = new Date(date);
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const currentHour = new Date().getHours();

    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip past times for today
        if (isToday && hour <= currentHour) {
          continue;
        }

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        slots.push({
          value: timeString,
          label: displayTime,
          available: true // In a real app, you'd check against existing appointments
        });
      }
    }
    setAvailableSlots(slots);
  };

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
      case 'P': return 'Pending';
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

  // Filter and sort appointments
  const filteredAndSortedAppointments = appointments
    .filter(appointment => {
      const matchesSearch = searchTerm === '' || 
        appointment.healthcare_provider?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.healthcare_provider?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          aValue = `${a.healthcare_provider?.first_name} ${a.healthcare_provider?.last_name}`.toLowerCase();
          bValue = `${b.healthcare_provider?.first_name} ${b.healthcare_provider?.last_name}`.toLowerCase();
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
                onClick={() => setShowBookingModal(true)}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
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
                        <p className="font-medium text-gray-900">
                          Dr. {appointment.healthcare_provider?.first_name} {appointment.healthcare_provider?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_date)}
                        </p>
                        <p className="text-sm text-blue-700">{appointment.reason}</p>
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
                    placeholder="Search by provider name or reason..."
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
                  <option value="P">Pending</option>
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
                  <option value="provider-asc">Provider A-Z</option>
                  <option value="provider-desc">Provider Z-A</option>
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
                    onClick={() => setShowBookingModal(true)}
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
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            Dr. {appointment.healthcare_provider?.first_name} {appointment.healthcare_provider?.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({appointment.healthcare_provider?.role?.name})
                          </span>
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
                        
                        {appointment.status === 'P' && (
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

          {/* Book Appointment Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Book New Appointment</h2>
                  <p className="text-sm text-gray-600 mt-1">Fill in the details to schedule your appointment</p>
                </div>
                
                <form onSubmit={handleBookAppointment} className="p-6 space-y-4">
                  <div>
                    <select
                      required
                      value={bookingData.healthcare_provider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a healthcare provider</option>
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          Dr. {provider.first_name} {provider.last_name} ({provider.role?.name})
                          {provider.specialization && ` - ${provider.specialization}`}
                        </option>
                      ))}
                    </select>
                    {selectedProvider && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Selected:</strong> Dr. {selectedProvider.first_name} {selectedProvider.last_name}
                        </p>
                        {selectedProvider.specialization && (
                          <p className="text-sm text-blue-700">Specialization: {selectedProvider.specialization}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={bookingData.appointment_date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time *
                      </label>
                      {availableSlots.length > 0 ? (
                        <select
                          required
                          value={bookingData.appointment_time}
                          onChange={(e) => setBookingData({...bookingData, appointment_time: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select time</option>
                          {availableSlots.map(slot => (
                            <option key={slot.value} value={slot.value} disabled={!slot.available}>
                              {slot.label} {!slot.available && '(Booked)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="time"
                          required
                          min="08:00"
                          max="18:00"
                          value={bookingData.appointment_time}
                          onChange={(e) => setBookingData({...bookingData, appointment_time: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">Available: 8:00 AM - 6:00 PM (Mon-Fri)</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Visit *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={bookingData.reason}
                      onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                      placeholder="Please describe the reason for your appointment, any symptoms, or specific concerns you'd like to discuss..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {bookingData.reason.length}/500 characters
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Important Notes:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Your appointment request will be reviewed and you'll receive confirmation within 24 hours</li>
                          <li>For urgent medical concerns, please call emergency services or visit the nearest hospital</li>
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
                        resetBookingForm();
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!bookingData.healthcare_provider || !bookingData.appointment_date || !bookingData.appointment_time || !bookingData.reason.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Book Appointment
                    </button>
                  </div>
                </form>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Healthcare Provider *
                    </label>
                    <select
                      required
                      value={editingAppointment.healthcare_provider}
                      onChange={(e) => setEditingAppointment({...editingAppointment, healthcare_provider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a healthcare provider</option>
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          Dr. {provider.first_name} {provider.last_name} ({provider.role?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  
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
                    <label className="block text-sm font-medium text-gray-500 mb-2">Healthcare Provider</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Dr. {selectedAppointment.healthcare_provider?.first_name} {selectedAppointment.healthcare_provider?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedAppointment.healthcare_provider?.role?.name}
                          {selectedAppointment.healthcare_provider?.specialization && 
                            ` • ${selectedAppointment.healthcare_provider.specialization}`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Reason for Visit</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{selectedAppointment.reason}</p>
                    </div>
                  </div>
                  
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Provider Notes</label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block font-medium text-gray-500 mb-1">Created</label>
                      <p className="text-gray-700">{formatDate(selectedAppointment.created_at)}</p>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-500 mb-1">Last Updated</label>
                      <p className="text-gray-700">{formatDate(selectedAppointment.updated_at)}</p>
                    </div>
                  </div>

                  {selectedAppointment.status === 'A' && isUpcoming(selectedAppointment) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Appointment Confirmed</p>
                          <p>Your appointment has been approved. Please arrive 15 minutes early and bring a valid ID and insurance card if applicable.</p>
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
                    {selectedAppointment.status === 'P' && (
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