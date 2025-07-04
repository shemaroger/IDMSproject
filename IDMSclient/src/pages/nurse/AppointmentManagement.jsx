// src/pages/nurse/AppointmentManagement.jsx
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
  Bell,
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const AppointmentManagement = () => {
  // =========================== STATE MANAGEMENT ===========================
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Data
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const currentUser = authAPI.getCurrentUser();
  const isNurse = currentUser?.role?.name === 'Nurse';

  // =========================== UTILITY FUNCTIONS ===========================
  const getPriorityLevel = useCallback((appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return 'overdue';
    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'tomorrow';
    if (daysDiff <= 3) return 'urgent';
    return 'normal';
  }, []);

  // =========================== MEMOIZED VALUES ===========================
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'P').length,
      approved: appointments.filter(apt => apt.status === 'A').length,
      completed: appointments.filter(apt => apt.status === 'D').length,
      cancelled: appointments.filter(apt => apt.status === 'C').length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= today && aptDate < tomorrow;
      }).length,
      overdue: appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate < today && ['P', 'A'].includes(apt.status);
      }).length,
      needsAttention: appointments.filter(apt => {
        const priority = getPriorityLevel(apt);
        return apt.status === 'P' && ['overdue', 'today', 'urgent'].includes(priority);
      }).length
    };
  }, [appointments, getPriorityLevel]);

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

      // Status filter
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

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
          case 'pending_approval':
            return appointment.status === 'P';
          default:
            return true;
        }
      })();

      return matchesStatus && matchesDate;
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
        case 'status':
          const statusOrder = { 'P': 1, 'A': 2, 'D': 3, 'C': 4, 'N': 5, 'R': 6 };
          aValue = statusOrder[a.status] || 7;
          bValue = statusOrder[b.status] || 7;
          break;
        case 'priority':
          const priorityOrder = { 'overdue': 1, 'today': 2, 'tomorrow': 3, 'urgent': 4, 'normal': 5 };
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
  }, [appointments, searchTerm, statusFilter, dateFilter, sortBy, sortOrder, getPriorityLevel]);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'P': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'A': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'C': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'D': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'N': return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      case 'R': return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getStatusText = useCallback((status) => {
    const statusMap = {
      'P': 'Pending',
      'A': 'Approved',
      'C': 'Cancelled',
      'D': 'Completed',
      'N': 'No Show',
      'R': 'Rescheduled'
    };
    return statusMap[status] || 'Unknown';
  }, []);

  const getStatusColor = useCallback((status) => {
    const colorMap = {
      'P': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'A': 'bg-green-100 text-green-800 border-green-200',
      'C': 'bg-red-100 text-red-800 border-red-200',
      'D': 'bg-blue-100 text-blue-800 border-blue-200',
      'N': 'bg-gray-100 text-gray-800 border-gray-200',
      'R': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const getPriorityColor = useCallback((priority) => {
    const colorMap = {
      'overdue': 'bg-red-100 text-red-800 border-red-300',
      'today': 'bg-orange-100 text-orange-800 border-orange-300',
      'tomorrow': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'urgent': 'bg-blue-100 text-blue-800 border-blue-300',
      'normal': 'bg-gray-100 text-gray-800 border-gray-300'
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
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await appointmentService.getAppointments({
        ordering: '-appointment_date'
      });
      
      if (response.success) {
        setAppointments(response.appointments || []);
        setLastRefresh(new Date());
      } else {
        setError('Failed to fetch appointments. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to fetch appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================== APPOINTMENT ACTIONS ===========================
  const handleApproveAppointment = async (appointmentId) => {
    try {
      const response = await appointmentService.approveAppointment(appointmentId);
      if (response.success) {
        setSuccess(response.message);
        fetchAppointments();
      } else {
        setError(response.message || 'Failed to approve appointment');
      }
    } catch (err) {
      console.error('Error approving appointment:', err);
      setError(err.message || 'Failed to approve appointment');
    }
  };

  const handleDenyAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to deny this appointment? This action will notify the patient.')) {
      return;
    }

    try {
      const response = await appointmentService.cancelAppointment(appointmentId);
      if (response.success) {
        setSuccess(response.message);
        fetchAppointments();
      } else {
        setError(response.message || 'Failed to deny appointment');
      }
    } catch (err) {
      console.error('Error denying appointment:', err);
      setError(err.message || 'Failed to deny appointment');
    }
  };

  const handleUpdateAppointmentNotes = async (appointmentId, notes) => {
    try {
      const response = await appointmentService.updateAppointment(appointmentId, { notes });
      if (response.success) {
        setSuccess('Notes updated successfully');
        setShowNotesModal(false);
        setAppointmentNotes('');
        fetchAppointments();
      } else {
        setError(response.message || 'Failed to update notes');
      }
    } catch (err) {
      console.error('Error updating notes:', err);
      setError(err.message || 'Failed to update notes');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedAppointments.length === 0) {
      setError('Please select appointments to perform bulk action');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : 'deny';
    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedAppointments.length} appointment(s)?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      let response;
      
      if (action === 'approve') {
        response = await appointmentService.bulkApprove?.(selectedAppointments) || 
                  await Promise.all(selectedAppointments.map(id => appointmentService.approveAppointment(id)));
      } else if (action === 'deny') {
        response = await appointmentService.bulkCancel(selectedAppointments);
      }
      
      if (response?.success || Array.isArray(response)) {
        const successCount = Array.isArray(response) ? 
          response.filter(r => r.success).length : 
          response.succeededCount || selectedAppointments.length;
          
        setSuccess(`Successfully ${actionText}ed ${successCount} appointment(s)`);
        setSelectedAppointments([]);
        fetchAppointments();
      } else {
        setError(response?.message || `Failed to ${actionText} appointments`);
      }
    } catch (err) {
      console.error(`Error ${actionText}ing appointments:`, err);
      setError(err.message || `Failed to ${actionText} appointments`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // =========================== SELECTION HANDLERS ===========================
  const handleSelectAppointment = (appointmentId) => {
    setSelectedAppointments(prev => 
      prev.includes(appointmentId) 
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === filteredAndSortedAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(filteredAndSortedAppointments.map(apt => apt.id));
    }
  };

  const handleQuickFilter = (filterType) => {
    switch (filterType) {
      case 'pending':
        setStatusFilter('P');
        setDateFilter('all');
        break;
      case 'today':
        setDateFilter('today');
        setStatusFilter('all');
        break;
      case 'urgent':
        setDateFilter('pending_approval');
        setStatusFilter('P');
        break;
      case 'overdue':
        setDateFilter('past');
        setStatusFilter('P');
        break;
      default:
        setStatusFilter('all');
        setDateFilter('all');
    }
  };

  // =========================== EFFECTS ===========================
  useEffect(() => {
    if (!isNurse) {
      setError('Access denied. This page is for nurses only.');
      return;
    }
    
    fetchAppointments();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchAppointments, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAppointments, isNurse]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // =========================== EARLY RETURN FOR ACCESS CONTROL ===========================
  if (!isNurse) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-700">This page is only accessible to nurses.</p>
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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Management</h1>
                <p className="text-gray-600">
                  Manage and approve patient appointments • Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                <button
                  onClick={fetchAppointments}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('all')}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('pending')}>
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.pending}</p>
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
                  <p className="text-xl font-semibold text-gray-900">{stats.approved}</p>
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
                  <p className="text-xl font-semibold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cancelled</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.cancelled}</p>
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
                 onClick={() => handleQuickFilter('overdue')}>
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.overdue}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => handleQuickFilter('urgent')}>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Urgent</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.needsAttention}</p>
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
                    placeholder="Search by patient name, provider, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="P">Pending</option>
                  <option value="A">Approved</option>
                  <option value="C">Cancelled</option>
                  <option value="D">Completed</option>
                  <option value="N">No Show</option>
                  <option value="R">Rescheduled</option>
                </select>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Dates</option>
                  <option value="pending_approval">Needs Approval</option>
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
                  <option value="date-asc">Date (Earliest)</option>
                  <option value="date-desc">Date (Latest)</option>
                  <option value="priority-asc">Priority (High)</option>
                  <option value="patient-asc">Patient A-Z</option>
                  <option value="provider-asc">Provider A-Z</option>
                  <option value="status-asc">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* =========================== BULK ACTIONS =========================== */}
          {selectedAppointments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedAppointments.length} appointment(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    disabled={bulkActionLoading}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Approve All'
                    )}
                  </button>
                  <button
                    onClick={() => handleBulkAction('deny')}
                    disabled={bulkActionLoading}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {bulkActionLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Deny All'
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedAppointments([])}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================== APPOINTMENTS LIST =========================== */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            ) : filteredAndSortedAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : 'No appointments scheduled at this time'}
                </p>
                {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAppointments.length === filteredAndSortedAppointments.length && filteredAndSortedAppointments.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-3 text-sm font-medium text-gray-700">
                        Select All ({filteredAndSortedAppointments.length})
                      </label>
                    </div>
                    <div className="text-sm text-gray-500">
                      Showing {filteredAndSortedAppointments.length} of {appointments.length} appointments
                    </div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-gray-200">
                  {filteredAndSortedAppointments.map((appointment) => {
                    const priority = getPriorityLevel(appointment);
                    const isSelected = selectedAppointments.includes(appointment.id);
                    
                    return (
                      <div 
                        key={appointment.id} 
                        className={`p-6 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectAppointment(appointment.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Status and Priority */}
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(appointment.status)}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                      {getStatusText(appointment.status)}
                                    </span>
                                  </div>
                                  
                                  {priority !== 'normal' && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
                                      {priority === 'overdue' ? 'Overdue' : 
                                       priority === 'today' ? 'Today' :
                                       priority === 'tomorrow' ? 'Tomorrow' : 'Urgent'}
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
                                </div>

                                {/* Provider Information */}
                                <div className="flex items-center gap-2 mb-3">
                                  <Stethoscope className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">
                                    {appointment.doctor_name}
                                  </span>
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

                                {appointment.status === 'P' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveAppointment(appointment.id)}
                                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Approve Appointment"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    
                                    <button
                                      onClick={() => handleDenyAppointment(appointment.id)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Deny Appointment"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setAppointmentNotes(appointment.notes || '');
                                    setShowNotesModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title="Add/Edit Notes"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
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
                      {getStatusIcon(selectedAppointment.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                        {getStatusText(selectedAppointment.status)}
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
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedAppointment.patient_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Healthcare Provider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Healthcare Provider</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedAppointment.doctor_name}
                        </p>
                      </div>
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
                      <label className="block font-medium text-gray-500 mb-1">Created</label>
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
                    
                    {selectedAppointment.status === 'P' && (
                      <>
                        <button
                          onClick={() => {
                            handleApproveAppointment(selectedAppointment.id);
                            setShowDetailsModal(false);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            handleDenyAppointment(selectedAppointment.id);
                            setShowDetailsModal(false);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Deny
                        </button>
                      </>
                    )}
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
                    Add/Edit Notes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Add notes for this appointment
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      rows={4}
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="Enter any notes about this appointment..."
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
                      Save Notes
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

export default AppointmentManagement;