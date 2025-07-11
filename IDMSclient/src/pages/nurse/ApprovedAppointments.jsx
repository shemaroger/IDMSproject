// src/pages/doctor/ApprovedAppointments.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import appointmentService from '../../services/appointmentService';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  FileText,
  CalendarDays,
  MessageSquare,
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Filter,
  Download,
  CalendarCheck
} from 'lucide-react';

const ApprovedAppointments = () => {
  // =========================== STATE MANAGEMENT ===========================
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Data
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const currentUser = authAPI.getCurrentUser();
  const isDoctor = currentUser?.role?.name === 'Doctor';

  // =========================== UTILITY FUNCTIONS ===========================
  const getPriorityLevel = useCallback((appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return 'past';
    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'tomorrow';
    if (daysDiff <= 3) return 'upcoming';
    return 'future';
  }, []);

  // =========================== MEMOIZED VALUES ===========================
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      total: appointments.length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= today && aptDate < tomorrow;
      }).length,
      tomorrow: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= tomorrow && aptDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      }).length,
      thisWeek: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= today && aptDate <= nextWeek;
      }).length,
      upcoming: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate > today;
      }).length,
      past: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate < today;
      }).length
    };
  }, [appointments]);

  const filteredAndSortedAppointments = useMemo(() => {
    let filtered = appointments.filter(appointment => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          appointment.patient_name?.toLowerCase().includes(searchLower) ||
          appointment.doctor_name?.toLowerCase().includes(searchLower) ||
          appointment.clinic_name?.toLowerCase().includes(searchLower) ||
          appointment.reason?.toLowerCase().includes(searchLower) ||
          appointment.symptoms?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date filter
      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        
        const appointmentDate = new Date(appointment.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        switch (dateFilter) {
          case 'today':
            return appointmentDate >= today && appointmentDate < tomorrow;
          case 'tomorrow':
            return appointmentDate >= tomorrow && appointmentDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
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

      return matchesDate;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.appointment_date);
          bValue = new Date(b.appointment_date);
          break;
        case 'patient':
          aValue = a.patient_name?.toLowerCase() || '';
          bValue = b.patient_name?.toLowerCase() || '';
          break;
        case 'provider':
          aValue = a.doctor_name?.toLowerCase() || '';
          bValue = b.doctor_name?.toLowerCase() || '';
          break;
        case 'priority':
          const priorityOrder = { 'past': 1, 'today': 2, 'tomorrow': 3, 'upcoming': 4, 'future': 5 };
          aValue = priorityOrder[getPriorityLevel(a)] || 6;
          bValue = priorityOrder[getPriorityLevel(b)] || 6;
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

    return filtered;
  }, [appointments, searchTerm, dateFilter, sortBy, sortOrder, getPriorityLevel]);

  const getPriorityColor = useCallback((priority) => {
    const colorMap = {
      'past': 'bg-gray-100 text-gray-800 border-gray-300',
      'today': 'bg-orange-100 text-orange-800 border-orange-300',
      'tomorrow': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'upcoming': 'bg-blue-100 text-blue-800 border-blue-300',
      'future': 'bg-green-100 text-green-800 border-green-300'
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatTime = useCallback((dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // =========================== DATA FETCHING ===========================
  const fetchApprovedAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await appointmentService.getAppointments({
        status: 'A', // Only approved appointments
        doctor: currentUser?.id, // Only appointments for this doctor
        ordering: '-appointment_date'
      });
      
      if (response.success) {
        setAppointments(response.appointments || []);
        setLastRefresh(new Date());
      } else {
        setError('Failed to fetch approved appointments. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching approved appointments:', err);
      setError('Failed to fetch approved appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================== APPOINTMENT ACTIONS ===========================
  const handleUpdateAppointmentNotes = async (appointmentId, notes) => {
    try {
      const response = await appointmentService.updateAppointment(appointmentId, { notes });
      if (response.success) {
        setSuccess('Notes updated successfully');
        setShowNotesModal(false);
        setAppointmentNotes('');
        fetchApprovedAppointments();
      } else {
        setError(response.message || 'Failed to update notes');
      }
    } catch (err) {
      console.error('Error updating notes:', err);
      setError(err.message || 'Failed to update notes');
    }
  };

  const handleQuickFilter = (filterType) => {
    switch (filterType) {
      case 'today':
        setDateFilter('today');
        break;
      case 'tomorrow':
        setDateFilter('tomorrow');
        break;
      case 'this_week':
        setDateFilter('this_week');
        break;
      case 'upcoming':
        setDateFilter('upcoming');
        break;
      default:
        setDateFilter('all');
    }
  };

  const exportAppointments = () => {
    const csvData = filteredAndSortedAppointments.map(apt => ({
      'Date': formatDate(apt.appointment_date),
      'Time': formatTime(apt.appointment_date),
      'Patient': apt.patient_name,
      'Provider': apt.doctor_name,
      'Clinic': apt.clinic_name || '',
      'Reason': apt.reason,
      'Symptoms': apt.symptoms || '',
      'Notes': apt.notes || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approved_appointments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // =========================== EFFECTS ===========================
  useEffect(() => {
    if (!isDoctor) {
      setError('Access denied. This page is for doctors only.');
      return;
    }
    
    fetchApprovedAppointments();
    
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchApprovedAppointments, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchApprovedAppointments, isDoctor]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // =========================== EARLY RETURN FOR ACCESS CONTROL ===========================
  if (!isDoctor) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-700">This page is only accessible to doctors.</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // =========================== MAIN RENDER ===========================
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* =========================== HEADER =========================== */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CalendarCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Approved Appointments</h1>
                </div>
                <p className="text-gray-600">
                  View and manage your confirmed appointments • Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                <button
                  onClick={exportAppointments}
                  disabled={filteredAndSortedAppointments.length === 0}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={fetchApprovedAppointments}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* =========================== ALERTS =========================== */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 flex-1">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700"
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
                <p className="text-green-700 flex-1">{success}</p>
                <button
                  onClick={() => setSuccess('')}
                  className="text-green-500 hover:text-green-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================== STATISTICS DASHBOARD =========================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('all')}>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Approved</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('today')}>
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.today}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('tomorrow')}>
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tomorrow</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.tomorrow}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('this_week')}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.thisWeek}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('upcoming')}>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.upcoming}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Past</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.past}</p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================== FILTERS AND SEARCH =========================== */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient name, clinic, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="date-asc">Date (Earliest)</option>
                  <option value="date-desc">Date (Latest)</option>
                  <option value="priority-asc">Priority (Today First)</option>
                  <option value="patient-asc">Patient A-Z</option>
                  <option value="provider-asc">Provider A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* =========================== APPOINTMENTS LIST =========================== */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading approved appointments...</p>
              </div>
            ) : filteredAndSortedAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No approved appointments found</h3>
                <p className="text-gray-600">
                  {searchTerm || dateFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : 'No approved appointments at this time'}
                </p>
                {(searchTerm || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDateFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-3 border-b border-gray-200 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="text-sm font-medium text-green-900">
                        Approved Appointments ({filteredAndSortedAppointments.length})
                      </h3>
                    </div>
                    <div className="text-sm text-green-700">
                      Showing {filteredAndSortedAppointments.length} of {appointments.length} appointments
                    </div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-gray-200">
                  {filteredAndSortedAppointments.map((appointment) => {
                    const priority = getPriorityLevel(appointment);
                    
                    return (
                      <div 
                        key={appointment.id} 
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Status indicator */}
                          <div className="flex-shrink-0 mt-1">
                            <div className="bg-green-100 p-2 rounded-full">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Priority Badge */}
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    Approved
                                  </span>
                                  
                                  {priority !== 'future' && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
                                      {priority === 'past' ? 'Past' : 
                                       priority === 'today' ? 'Today' :
                                       priority === 'tomorrow' ? 'Tomorrow' : 'This Week'}
                                    </span>
                                  )}
                                </div>

                                {/* Date and Time */}
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

                                {/* Patient Information */}
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">
                                    {appointment.patient_name}
                                  </span>
                                  {appointment.patient_phone && (
                                    <span className="text-sm text-gray-500 ml-2">
                                      • {appointment.patient_phone}
                                    </span>
                                  )}
                                </div>

                                {/* Clinic Information */}
                                {appointment.clinic_name && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{appointment.clinic_name}</span>
                                  </div>
                                )}

                                {/* Reason */}
                                <div className="flex items-start gap-2 mb-3">
                                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{appointment.reason}</span>
                                </div>

                                {/* Symptoms */}
                                {appointment.symptoms && (
                                  <div className="flex items-start gap-2 mb-3">
                                    <Activity className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">
                                      <strong>Symptoms:</strong> {appointment.symptoms}
                                    </span>
                                  </div>
                                )}

                                {/* Notes */}
                                {appointment.notes && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                      <strong>Notes:</strong> {appointment.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
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

                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setAppointmentNotes(appointment.notes || '');
                                    setShowNotesModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Add Diagnosis/Notes"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>

                                {/* Add Contact Patient Button */}
                                {appointment.patient_phone && (
                                  <a
                                    href={`tel:${appointment.patient_phone}`}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Call Patient"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* =========================== APPOINTMENT DETAILS MODAL =========================== */}
          {showDetailsModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="px-3 py-1 rounded-full text-sm font-medium border bg-green-100 text-green-800 border-green-200">
                        Approved
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Date and Time */}
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

                  {/* Patient Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Patient Information</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedAppointment.patient_name}
                        </p>
                        {selectedAppointment.patient_phone && (
                          <p className="text-sm text-gray-600">
                            Phone: {selectedAppointment.patient_phone}
                          </p>
                        )}
                      </div>
                      {selectedAppointment.patient_phone && (
                        <a
                          href={`tel:${selectedAppointment.patient_phone}`}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Call Patient"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Clinic Information */}
                  {selectedAppointment.clinic_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Clinic</label>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <MapPin className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedAppointment.clinic_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Reason for Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Reason for Visit</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{selectedAppointment.reason}</p>
                    </div>
                  </div>

                  {/* Symptoms */}
                  {selectedAppointment.symptoms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Symptoms</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-900">{selectedAppointment.symptoms}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Notes */}
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Diagnosis */}
                  {selectedAppointment.diagnosis && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Diagnosis</label>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-800">{selectedAppointment.diagnosis}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block font-medium text-gray-500 mb-1">Approved On</label>
                      <p className="text-gray-700">{formatDate(selectedAppointment.created_at)}</p>
                    </div>
                    {selectedAppointment.updated_at && (
                      <div>
                        <label className="block font-medium text-gray-500 mb-1">Last Updated</label>
                        <p className="text-gray-700">{formatDate(selectedAppointment.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedAppointment(selectedAppointment);
                        setAppointmentNotes(selectedAppointment.notes || '');
                        setShowNotesModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================== NOTES MODAL =========================== */}
          {showNotesModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Add Diagnosis & Notes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Add diagnosis and notes for this appointment
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diagnosis & Notes
                    </label>
                    <textarea
                      rows={4}
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="Enter diagnosis, treatment notes, or follow-up instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {appointmentNotes.length}/500 characters
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowNotesModal(false);
                        setAppointmentNotes('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateAppointmentNotes(selectedAppointment.id, appointmentNotes);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Diagnosis
                    </button>
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

export default ApprovedAppointments;