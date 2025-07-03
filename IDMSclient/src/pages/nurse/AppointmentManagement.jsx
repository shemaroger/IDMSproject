// src/pages/nurse/AppointmentManagement.jsx
import { useState, useEffect } from 'react';
import { healthcareAPI, authAPI, apiUtils } from '../../services/api';
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
  Filter,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  FileText,
  Users,
  UserCheck,
  CalendarDays,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Bell,
  TrendingUp,
  Activity,
  Star,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw
} from 'lucide-react';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('list'); // list, calendar, stats
  
  // Providers list for filtering
  const [providers, setProviders] = useState([]);
  
  const currentUser = authAPI.getCurrentUser();

  useEffect(() => {
    fetchAppointments();
    fetchProviders();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAppointments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const handleApproveAppointment = async (appointmentId) => {
    try {
      await healthcareAPI.appointments.approve(appointmentId);
      setSuccess('Appointment approved successfully');
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

  const handleDenyAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to deny this appointment? This action will notify the patient.')) {
      return;
    }

    try {
      await healthcareAPI.appointments.cancel(appointmentId);
      setSuccess('Appointment denied successfully');
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

  const handleCompleteAppointment = async (appointmentId, notes = '') => {
    try {
      await healthcareAPI.appointments.complete(appointmentId, notes);
      setSuccess('Appointment marked as completed');
      setShowNotesModal(false);
      setAppointmentNotes('');
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedAppointments.length === 0) {
      setError('Please select appointments to perform bulk action');
      return;
    }

    const actionText = action === 'approve' ? 'approve' : action === 'deny' ? 'deny' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedAppointments.length} appointment(s)?`)) {
      return;
    }

    try {
      if (action === 'approve') {
        await healthcareAPI.appointments.bulkApprove(selectedAppointments);
      } else if (action === 'deny' || action === 'cancel') {
        await healthcareAPI.appointments.bulkCancel(selectedAppointments);
      }
      
      setSuccess(`Successfully ${actionText}ed ${selectedAppointments.length} appointment(s)`);
      setSelectedAppointments([]);
      fetchAppointments();
    } catch (err) {
      setError(apiUtils.formatErrorMessage(err));
    }
  };

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

  const getPriorityLevel = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return 'overdue';
    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'tomorrow';
    if (daysDiff <= 3) return 'urgent';
    return 'normal';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      case 'today': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'tomorrow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'urgent': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
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

  // Filter and sort appointments
  const filteredAndSortedAppointments = appointments
    .filter(appointment => {
      const matchesSearch = searchTerm === '' || 
        appointment.patient?.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.patient?.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.healthcare_provider?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.healthcare_provider?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesProvider = providerFilter === 'all' || appointment.healthcare_provider?.id === parseInt(providerFilter);

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
          case 'pending_approval':
            return appointment.status === 'P';
          default:
            return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesProvider && matchesDate;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.appointment_date);
          bValue = new Date(b.appointment_date);
          break;
        case 'patient':
          aValue = `${a.patient?.user?.first_name} ${a.patient?.user?.last_name}`.toLowerCase();
          bValue = `${b.patient?.user?.first_name} ${b.patient?.user?.last_name}`.toLowerCase();
          break;
        case 'provider':
          aValue = `${a.healthcare_provider?.first_name} ${a.healthcare_provider?.last_name}`.toLowerCase();
          bValue = `${b.healthcare_provider?.first_name} ${b.healthcare_provider?.last_name}`.toLowerCase();
          break;
        case 'status':
          const statusOrder = { 'P': 1, 'A': 2, 'D': 3, 'C': 4 };
          aValue = statusOrder[a.status] || 5;
          bValue = statusOrder[b.status] || 5;
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

  // Get today's date for min date input
  const today = new Date().toISOString().split('T')[0];

  // Statistics
  const stats = {
    total: appointments.length,
    pending: appointments.filter(apt => apt.status === 'P').length,
    approved: appointments.filter(apt => apt.status === 'A').length,
    completed: appointments.filter(apt => apt.status === 'D').length,
    cancelled: appointments.filter(apt => apt.status === 'C').length,
    today: appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      const today = new Date();
      return aptDate.toDateString() === today.toDateString();
    }).length,
    needsAttention: appointments.filter(apt => apt.status === 'P' && getPriorityLevel(apt) !== 'normal').length
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Management</h1>
                <p className="text-gray-600">Manage and approve patient appointments</p>
              </div>
              <div className="mt-4 lg:mt-0 flex gap-3">
                <button
                  onClick={fetchAppointments}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('stats')}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Stats
                  </button>
                </div>
              </div>
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

          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
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
            
            <div className="bg-white rounded-lg shadow-sm p-4">
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
            
            <div className="bg-white rounded-lg shadow-sm p-4">
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
            
            <div className="bg-white rounded-lg shadow-sm p-4">
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

          {/* Filters and Search */}
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
                  <option value="pending_approval">Needs Approval</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
                
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Providers</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      Dr. {provider.first_name} {provider.last_name}
                    </option>
                  ))}
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

          {/* Bulk Actions */}
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
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => handleBulkAction('deny')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Deny All
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

          {/* Appointments List */}
          <div className="bg-white rounded-lg shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            ) : filteredAndSortedAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || providerFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : 'No appointments scheduled at this time'}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
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
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-gray-200">
                  {filteredAndSortedAppointments.map((appointment) => {
                    const priority = getPriorityLevel(appointment);
                    return (
                      <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={selectedAppointments.includes(appointment.id)}
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
                                    {appointment.patient?.user?.first_name} {appointment.patient?.user?.last_name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({appointment.patient?.user?.email})
                                  </span>
                                </div>

                                {/* Provider Information */}
                                <div className="flex items-center gap-2 mb-3">
                                  <Stethoscope className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">
                                    Dr. {appointment.healthcare_provider?.first_name} {appointment.healthcare_provider?.last_name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({appointment.healthcare_provider?.role?.name})
                                  </span>
                                </div>

                                {/* Reason */}
                                <div className="flex items-start gap-2 mb-3">
                                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{appointment.reason}</span>
                                </div>

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

                                {appointment.status === 'A' && (
                                  <button
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setShowNotesModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Mark as Completed"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowNotesModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title="Add Notes"
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

          {/* Appointment Details Modal */}
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
                          {selectedAppointment.patient?.user?.first_name} {selectedAppointment.patient?.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{selectedAppointment.patient?.user?.email}</p>
                        {selectedAppointment.patient?.phone_number && (
                          <p className="text-sm text-gray-600">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {selectedAppointment.patient.phone_number}
                          </p>
                        )}
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
                  
                  {/* Reason for Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Reason for Visit</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{selectedAppointment.reason}</p>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Timestamps */}
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

                    {selectedAppointment.status === 'A' && (
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setShowNotesModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes/Complete Modal */}
          {showNotesModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedAppointment.status === 'A' ? 'Complete Appointment' : 'Add Notes'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAppointment.status === 'A' 
                      ? 'Add any notes about the appointment and mark it as completed'
                      : 'Add notes for this appointment'
                    }
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
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
                        if (selectedAppointment.status === 'A') {
                          handleCompleteAppointment(selectedAppointment.id, appointmentNotes);
                        } else {
                          // Just add notes without changing status
                          setShowNotesModal(false);
                          setAppointmentNotes('');
                          setSuccess('Notes added successfully');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {selectedAppointment.status === 'A' ? 'Complete Appointment' : 'Save Notes'}
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